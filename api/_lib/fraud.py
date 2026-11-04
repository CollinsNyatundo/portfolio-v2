"""Fraud scoring for the demo (docs/02 §3, docs/05 §5, tasks 4.1 and 4.2).

Reimplements the creditcard-fraud training pipeline's 79 features for one
transaction from its raw values and the 10 transactions before it, using
parameters exported to prep.json (no pickle is ever loaded: 07 item 58).

Pipeline facts this code mirrors (creditcard-fraud at d501607):
- RobustScaler on V1-V28, Amount, Amount_Log and Amount_Normalized, fitted
  on the full dataset; rolling and interaction features use the *scaled*
  Amount.
- Rolling windows (3, 5, 10, pandas sample std) and expanding sums run over
  the test split sorted by Time, so each sample carries its window and the
  split's running totals before it.
- Behaviour cluster: nearest of the KMeans centroids fitted on the balanced
  training set.
- Probability: sigmoid(raw margin + init_score) (focal loss), then the Platt
  calibrator the repo fits on the validation split; the threshold applies to
  the calibrated value.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

DATA_DIR = Path(__file__).resolve().parents[1] / "_data" / "fraud"
RAW_FEATURES = ["Time", *[f"V{i}" for i in range(1, 29)], "Amount"]
WINDOW = 10


@dataclass(frozen=True)
class Prep:
    scaler_features: list[str]
    center: dict[str, float]
    scale: dict[str, float]
    time_mean: float
    time_std: float
    amount_mean: float
    amount_std: float
    split_amount_mean: float
    split_amount_std: float
    split_q99: float
    split_q01: float
    cluster_features: list[str]
    centroids: np.ndarray
    model_features: list[str]
    init_score: float
    calib_coef: float
    calib_intercept: float
    threshold: float
    model_version: str


@lru_cache(maxsize=1)
def prep() -> Prep:
    p = json.loads((DATA_DIR / "prep.json").read_text(encoding="utf-8"))
    return Prep(
        scaler_features=p["scaler"]["features"],
        center=dict(zip(p["scaler"]["features"], p["scaler"]["center"])),
        scale=dict(zip(p["scaler"]["features"], p["scaler"]["scale"])),
        time_mean=p["time"]["mean"],
        time_std=p["time"]["std"],
        amount_mean=p["amount"]["mean"],
        amount_std=p["amount"]["std"],
        split_amount_mean=p["split"]["amount_mean"],
        split_amount_std=p["split"]["amount_std"],
        split_q99=p["split"]["q99"],
        split_q01=p["split"]["q01"],
        cluster_features=p["clusters"]["features"],
        centroids=np.asarray(p["clusters"]["centroids"], dtype=np.float64),
        model_features=p["model"]["features"],
        init_score=p["model"]["init_score"],
        calib_coef=p["calibration"]["coef"],
        calib_intercept=p["calibration"]["intercept"],
        threshold=p["model"]["threshold"],
        model_version=p["model"]["version"],
    )


def _scaled(p: Prep, name: str, value: float) -> float:
    return (value - p.center[name]) / p.scale[name]


def _rolling_std(values: list[float]) -> float:
    """pandas .rolling().std(): sample std (ddof=1); 0 for a single value."""
    if len(values) < 2:
        return 0.0
    return float(np.std(values, ddof=1))


def features(
    target: dict[str, float],
    window: list[dict[str, float]],
    prior_sum: float,
    prior_count: int,
) -> dict[str, float]:
    """All 79 model features for `target`, given the 10 transactions before
    it (oldest first, raw Time and Amount) and the split's running totals of
    scaled Amount before the target."""
    if len(window) != WINDOW:
        raise ValueError(f"window must hold {WINDOW} transactions")
    p = prep()
    f: dict[str, float] = {}

    amount = float(target["Amount"])
    amount_log = math.log1p(amount)
    amount_norm = (amount - p.amount_mean) / p.amount_std
    raw_scaled = {f"V{i}": float(target[f"V{i}"]) for i in range(1, 29)}
    raw_scaled.update(
        {"Amount": amount, "Amount_Log": amount_log, "Amount_Normalized": amount_norm}
    )
    for name in p.scaler_features:
        f[name] = _scaled(p, name, raw_scaled[name])
    amt = f["Amount"]

    t = float(target["Time"])
    f["Time_Hours"] = t / 3600
    f["Time_Normalized"] = (t - p.time_mean) / p.time_std
    f["Time_Hour"] = (t / 3600) % 24
    f["Time_Hour_Sin"] = math.sin(2 * math.pi * f["Time_Hour"] / 24)
    f["Time_Hour_Cos"] = math.cos(2 * math.pi * f["Time_Hour"] / 24)

    f["Amount_Bin_Low"] = 1.0 if 0 < amount <= 10 else 0.0
    f["Amount_Bin_Medium"] = 1.0 if 10 < amount <= 100 else 0.0
    f["Amount_Bin_High"] = 1.0 if amount > 100 else 0.0
    # pd.cut leaves Amount == 0 as NaN, and the CSV round trip in the repo
    # turns that into a real NaN, which never equals the string "nan".
    f["Amount_Bin_nan"] = 0.0

    amounts = [_scaled(p, "Amount", float(w["Amount"])) for w in window] + [amt]
    times = [float(w["Time"]) for w in window] + [t]
    for w in (3, 5, 10):
        last = amounts[-w:]
        mean = float(np.mean(last))
        std = _rolling_std(last)
        f[f"amt_mean_{w}"] = mean
        f[f"amt_std_{w}"] = std
        f[f"amt_min_{w}"] = min(last)
        f[f"amt_max_{w}"] = max(last)
        f[f"amt_deviation_{w}"] = amt - mean
        f[f"amt_zscore_{w}"] = (amt - mean) / std if std > 0 else 0.0

    diffs = np.diff(times)  # time_since_last for the last 10 rows
    f["time_since_last"] = float(diffs[-1])
    f["avg_time_diff"] = float(np.mean(diffs[-10:]))
    f["tx_count_10"] = 10.0

    for v in ("V1", "V4", "V7", "V11", "V12"):
        f[f"amt_{v}_interaction"] = amt * f[v]
    for v in ("V1", "V4", "V11"):
        f[f"{v}_squared"] = f[v] ** 2
    f["amt_ratio_3"] = amt / (f["amt_mean_3"] + 1e-8)

    f["amt_overall_zscore"] = (amt - p.split_amount_mean) / (p.split_amount_std + 1e-8)
    f["amt_cumsum"] = prior_sum + amt
    f["amt_cumcount"] = float(prior_count + 1)
    f["amt_cummean"] = f["amt_cumsum"] / f["amt_cumcount"]
    f["amt_extremely_high"] = 1.0 if amt > p.split_q99 else 0.0
    f["amt_extremely_low"] = 1.0 if amt < p.split_q01 else 0.0

    x = np.asarray([f[c] for c in p.cluster_features], dtype=np.float64)
    cluster = int(np.argmin(((p.centroids - x) ** 2).sum(axis=1)))
    for i in range(len(p.centroids)):
        f[f"cluster_{i}"] = 1.0 if cluster == i else 0.0
    return f


def vector(f: dict[str, float]) -> np.ndarray:
    return np.asarray([[f[c] for c in prep().model_features]], dtype=np.float64)


def calibrated(raw_margin: float) -> float:
    """Focal-loss margin -> sigmoid -> the repo's Platt calibrator."""
    p = prep()
    s = 1.0 / (1.0 + math.exp(-(raw_margin + p.init_score)))
    z = p.calib_coef * s + p.calib_intercept
    return 1.0 / (1.0 + math.exp(-z))
