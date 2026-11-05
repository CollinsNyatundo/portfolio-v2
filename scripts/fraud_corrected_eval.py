#!/usr/bin/env python3
"""Re-measure the fraud model with training-only preprocessing.

The original pipeline (creditcard-fraud at d501607) fits the scaler, the
Time/Amount normalisation and three holdout features on data that includes later
transactions. This script rebuilds the same pipeline in two modes and trains the
same model (same hyperparameters, same focal loss) in both, so the only difference
is where preprocessing statistics come from:

  leaky  the original behaviour: global statistics, each split's own amount statistics
  clean  every statistic comes from the training block only

Everything else is held fixed: chronological 70/15/15 split, SMOTE (0.1) then random
undersampling (0.2) on the training block, window features computed within each split,
KMeans cluster features fitted on the balanced training block, Platt calibration and the
recall >= 0.85 threshold rule chosen on the validation block, the test block touched once.

Each mode runs twice: with the validation block folded into training (what the original
did, early-stopping on that same block) and with the model trained on the training block
only. The hyperparameters are the repo's stored best_params, not re-tuned.

Usage:  python scripts/fraud_corrected_eval.py <creditcard.csv> [out.json]
"""

from __future__ import annotations

import json
import sys
import time
import warnings
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from scipy import optimize
from scipy.special import expit
from sklearn.cluster import KMeans
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    silhouette_score,
)
from sklearn.preprocessing import RobustScaler

warnings.filterwarnings("ignore")

# Stored in reports/hyperparameter_optimization.json of the source repo.
PARAMS = {
    "alpha": 0.14831110778778947,
    "gamma": 4.912775955758993,
    "num_leaves": 27,
    "max_depth": 7,
    "learning_rate": 0.09956585944234846,
    "min_child_samples": 76,
    "subsample": 0.7311758069492176,
    "colsample_bytree": 0.6533425046510114,
    "reg_alpha": 0.4681017998712806,
    "reg_lambda": 7.761590818286464,
}
V = [f"V{i}" for i in range(1, 29)]
SCALED = [*V, "Amount", "Amount_Log", "Amount_Normalized"]


class FocalLoss:
    """Same maths as model/src/hyperparameter_tuning.py."""

    def __init__(self, alpha: float, gamma: float) -> None:
        self.alpha, self.gamma = alpha, gamma

    def _pt(self, y, p):
        p = np.clip(p, 1e-15, 1 - 1e-15)
        return np.where(y == 1, p, 1 - p)

    def loss(self, y, p):
        at = np.where(y == 1, self.alpha, 1 - self.alpha)
        pt = self._pt(y, p)
        return -at * (1 - pt) ** self.gamma * np.log(pt)

    def grad_hess(self, y, p):
        s, g = 2 * y - 1, self.gamma
        at = np.where(y == 1, self.alpha, 1 - self.alpha)
        pt = self._pt(y, p)
        grad = at * s * (1 - pt) ** g * (g * pt * np.log(pt) + pt - 1)
        u = at * s * (1 - pt) ** g
        du = -at * s * g * (1 - pt) ** (g - 1)
        v = g * pt * np.log(pt) + pt - 1
        dv = g * np.log(pt) + g + 1
        return grad, (du * v + u * dv) * s * (pt * (1 - pt))

    def init_score(self, y):
        r = optimize.minimize_scalar(
            lambda p: self.loss(y, p).sum(), bounds=(1e-15, 1 - 1e-15), method="bounded"
        )
        return float(np.log(r.x / (1 - r.x)))

    def lgb_obj(self, preds, data):
        y = data.get_label()
        return self.grad_hess(y, expit(preds))

    def lgb_eval(self, preds, data):
        return "focal_loss", float(np.mean(self.loss(data.get_label(), expit(preds)))), False


def engineer_base(df: pd.DataFrame, t_stats: tuple[float, float], a_stats: tuple[float, float]) -> pd.DataFrame:
    d = df.copy()
    d["Time_Hours"] = d["Time"] / 3600
    d["Time_Normalized"] = (d["Time"] - t_stats[0]) / t_stats[1]
    d["Time_Hour"] = (d["Time"] / 3600) % 24
    d["Time_Hour_Sin"] = np.sin(2 * np.pi * d["Time_Hour"] / 24)
    d["Time_Hour_Cos"] = np.cos(2 * np.pi * d["Time_Hour"] / 24)
    d["Amount_Log"] = np.log1p(d["Amount"])
    d["Amount_Normalized"] = (d["Amount"] - a_stats[0]) / a_stats[1]
    a = d["Amount"]
    d["Amount_Bin_Low"] = ((a > 0) & (a <= 10)).astype(float)
    d["Amount_Bin_Medium"] = ((a > 10) & (a <= 100)).astype(float)
    d["Amount_Bin_High"] = (a > 100).astype(float)
    d["Amount_Bin_nan"] = (a <= 0).astype(float)
    return d


def window_features(df: pd.DataFrame, overall: tuple[float, float, float, float] | None) -> pd.DataFrame:
    """Window, interaction and amount-distribution features (advanced_feature_engineering.py).

    overall = (mean, std, q01, q99) of the scaled Amount to use for the three
    distribution features; None means the split's own statistics (original behaviour).
    """
    d = df.sort_values("Time").reset_index(drop=True)
    d["time_since_last"] = d["Time"].diff().fillna(0)
    for w in (3, 5, 10):
        r = d["Amount"].rolling(window=w, min_periods=1)
        d[f"amt_mean_{w}"] = r.mean()
        d[f"amt_std_{w}"] = r.std().fillna(0)
        d[f"amt_min_{w}"] = r.min()
        d[f"amt_max_{w}"] = r.max()
        d[f"amt_deviation_{w}"] = d["Amount"] - d[f"amt_mean_{w}"]
        d[f"amt_zscore_{w}"] = np.where(
            d[f"amt_std_{w}"] > 0, d[f"amt_deviation_{w}"] / d[f"amt_std_{w}"], 0
        )
    d["tx_count_10"] = d["Time"].rolling(window=10, min_periods=1).count()
    d["avg_time_diff"] = d["time_since_last"].rolling(window=10, min_periods=1).mean()
    for v in ("V1", "V4", "V7", "V11", "V12"):
        d[f"amt_{v}_interaction"] = d["Amount"] * d[v]
    for v in ("V1", "V4", "V11"):
        d[f"{v}_squared"] = d[v] ** 2
    d["amt_ratio_3"] = d["Amount"] / (d["amt_mean_3"] + 1e-8)
    if overall is None:
        overall = (
            d["Amount"].mean(), d["Amount"].std(), d["Amount"].quantile(0.01), d["Amount"].quantile(0.99)
        )
    mean, std, q01, q99 = overall
    d["amt_overall_zscore"] = (d["Amount"] - mean) / (std + 1e-8)
    d["amt_cumsum"] = d["Amount"].expanding(min_periods=1).sum()
    d["amt_cumcount"] = d["Amount"].expanding(min_periods=1).count()
    d["amt_cummean"] = d["amt_cumsum"] / d["amt_cumcount"]
    d["amt_extremely_high"] = (d["Amount"] > q99).astype(int)
    d["amt_extremely_low"] = (d["Amount"] < q01).astype(int)
    return d


def build(raw: pd.DataFrame, mode: str) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, list[str]]:
    clean = mode == "clean"
    df = raw.sort_values("Time", kind="stable").reset_index(drop=True)
    n = len(df)
    tr_end = int(n * 0.70)
    va_end = tr_end + int(n * 0.15)
    src = df.iloc[:tr_end] if clean else df  # where statistics come from
    t_stats = (src["Time"].mean(), src["Time"].std())
    a_stats = (src["Amount"].mean(), src["Amount"].std())
    eng = engineer_base(df, t_stats, a_stats)
    scaler = RobustScaler().fit(eng.iloc[:tr_end][SCALED] if clean else eng[SCALED])
    eng[SCALED] = scaler.transform(eng[SCALED])
    train, val, test = eng.iloc[:tr_end], eng.iloc[tr_end:va_end], eng.iloc[va_end:]
    assert train["Time"].max() <= val["Time"].min() <= test["Time"].min()

    X, y = train.drop(columns="Class"), train["Class"]
    Xs, ys = SMOTE(sampling_strategy=0.1, random_state=42, k_neighbors=5).fit_resample(X, y)
    Xb, yb = RandomUnderSampler(sampling_strategy=0.2, random_state=42).fit_resample(Xs, ys)
    train_bal = Xb.assign(Class=yb.values)

    overall = None
    if clean:
        a = train["Amount"]  # scaled Amount over the real (not resampled) training block
        overall = (a.mean(), a.std(), a.quantile(0.01), a.quantile(0.99))
    tr, va, te = (window_features(s, overall) for s in (train_bal, val, test))

    base = [c for c in tr.columns if c not in ("Class", "Time")]
    sample = tr[base].sample(min(10000, len(tr)), random_state=42)
    best_k, best_s = 3, -1.0
    for k in range(3, 7):
        s = silhouette_score(sample, KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(sample))
        if s > best_s:
            best_k, best_s = k, s
    km = KMeans(n_clusters=best_k, random_state=42, n_init=10).fit(tr[base])
    for part in (tr, va, te):
        labels = km.predict(part[base])
        for i in range(best_k):
            part[f"cluster_{i}"] = (labels == i).astype(float)
    feats = [c for c in tr.columns if c not in ("Class", "Time")]
    return tr, va, te, feats


def metrics(y, p, thr):
    pred = (p >= thr).astype(int)
    return {
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
    }


def run(raw: pd.DataFrame, mode: str, fit_on_val: bool) -> dict:
    tr, va, te, feats = build(raw, mode)
    fl = FocalLoss(PARAMS["alpha"], PARAMS["gamma"])
    fit = pd.concat([tr, va]) if fit_on_val else tr
    init = fl.init_score(fit["Class"].values)
    p = {k: v for k, v in PARAMS.items() if k not in ("alpha", "gamma")}
    p.update(objective=fl.lgb_obj, metric="None", boosting_type="gbdt", verbose=-1, random_state=42)
    dtr = lgb.Dataset(fit[feats], label=fit["Class"], init_score=np.full(len(fit), init))
    dva = lgb.Dataset(va[feats], label=va["Class"], init_score=np.full(len(va), init), reference=dtr)
    model = lgb.train(
        p, dtr, num_boost_round=1000, valid_sets=[dva], feval=fl.lgb_eval,
        callbacks=[lgb.early_stopping(50, verbose=False)],
    )

    def prob(frame):
        return expit(model.predict(frame[feats], num_iteration=model.best_iteration) + init)

    pv, pt = prob(va), prob(te)
    lr = LogisticRegression().fit(pv.reshape(-1, 1), va["Class"])
    cv, ct = lr.predict_proba(pv.reshape(-1, 1))[:, 1], lr.predict_proba(pt.reshape(-1, 1))[:, 1]
    grid = np.arange(0.01, 1.0, 0.01)
    ok = [i for i, t in enumerate(grid) if recall_score(va["Class"], (cv >= t).astype(int), zero_division=0) >= 0.85]
    if ok:
        thr = float(grid[max(ok)])
    else:  # same fallback as the repo: the threshold with the best validation recall
        thr = float(grid[int(np.argmax([recall_score(va["Class"], (cv >= t).astype(int), zero_division=0) for t in grid]))])
    yt = te["Class"].values
    out = {
        "mode": mode,
        "validation_block_in_training": fit_on_val,
        "features": len(feats),
        "best_iteration": int(model.best_iteration),
        "threshold_on_calibrated_probability": thr,
        "validation_recall_at_threshold": float(recall_score(va["Class"], (cv >= thr).astype(int))),
        "test_rows": int(len(te)),
        "test_frauds": int(yt.sum()),
        "test": metrics(yt, ct, thr),
        "roc_auc": float(roc_auc_score(yt, ct)),
        "pr_auc_calibrated": float(average_precision_score(yt, ct)),
        "pr_auc_uncalibrated": float(average_precision_score(yt, pt)),
    }
    rng = np.random.default_rng(42)
    pred = (ct >= thr).astype(int)
    f1s, recs = [], []
    for _ in range(2000):
        i = rng.integers(0, len(yt), len(yt))
        f1s.append(f1_score(yt[i], pred[i], zero_division=0))
        recs.append(recall_score(yt[i], pred[i], zero_division=0))
    out["bootstrap_95ci"] = {
        "f1": [float(np.percentile(f1s, 2.5)), float(np.percentile(f1s, 97.5))],
        "recall": [float(np.percentile(recs, 2.5)), float(np.percentile(recs, 97.5))],
        "resamples": 2000,
    }
    rows = te[feats].iloc[rng.choice(len(te), 1000, replace=False)]
    model.predict(rows.iloc[:1], num_iteration=model.best_iteration)
    lat = []
    for i in range(len(rows)):
        t0 = time.perf_counter()
        model.predict(rows.iloc[i : i + 1], num_iteration=model.best_iteration)
        lat.append((time.perf_counter() - t0) * 1000)
    out["latency_ms_p95_single_row"] = float(np.percentile(lat, 95))
    return out


def main() -> None:
    raw = pd.read_csv(sys.argv[1])
    results = {
        f"{m}{'_fit_on_val' if v else ''}": run(raw, m, v)
        for m in ("leaky", "clean")
        for v in (True, False)
    }
    text = json.dumps(results, indent=2)
    print(text)
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
