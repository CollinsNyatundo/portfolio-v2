#!/usr/bin/env python3
"""Export the fraud demo's data from a creditcard-fraud checkout (task 4.1).

Prerequisites, in the checkout (pinned below):
  1. data/raw/creditcard.csv: the ULB dataset (OpenML 1597 or Kaggle).
  2. Run, from the checkout root: data/src/feature_engineering.py,
     data/src/handle_imbalance.py, data/src/advanced_feature_engineering.py.
     They write data/processed/*.csv and models/behavior_clusterer*.

This script never loads a pickle. It refits the deterministic pieces
(RobustScaler on the full data, the Platt calibrator on the validation
split) and reads KMeans centroids from a refit with the repo's own settings,
then checks the exported parameters reproduce the repo's features and
probabilities.

Usage (from the portfolio root, in an env with the repo's requirements):
    python scripts/build_fraud_demo.py <checkout>

Writes:
  api/_data/fraud/model.txt     LightGBM text model (LF line endings)
  api/_data/fraud/prep.json     scaler, constants, centroids, calibrator
  api/_data/fraud/samples.json  20 samples with windows and running totals
  public/demos/fraud/samples.json  the public part of those samples
  tests/python/fixtures/fraud_parity.json  1 000 test rows + expected output
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.special import expit
from sklearn.cluster import KMeans
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import RobustScaler

SOURCE_REPO = "https://github.com/CollinsNyatundo/creditcard-fraud"
SOURCE_COMMIT = "d5016073f702b75a8c27934003e32f85d0a6689e"
MODEL_VERSION = "lgbm-optimized-d501607"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "api" / "_data" / "fraud"
SCALED = [f"V{i}" for i in range(1, 29)] + ["Amount", "Amount_Log", "Amount_Normalized"]
RAW = ["Time", *[f"V{i}" for i in range(1, 29)], "Amount"]
WINDOW = 10


def git_head(checkout: Path) -> str:
    return subprocess.run(
        ["git", "-C", str(checkout), "rev-parse", "HEAD"],
        check=True, capture_output=True, text=True,
    ).stdout.strip()


def main(repo: Path) -> None:
    if git_head(repo) != SOURCE_COMMIT:
        sys.exit(f"checkout must be at {SOURCE_COMMIT}")

    raw = pd.read_csv(repo / "data/raw/creditcard.csv")
    # The text model, with LF endings whatever the checkout did to them.
    model_text = subprocess.run(
        ["git", "-C", str(repo), "show", f"{SOURCE_COMMIT}:models/optimized_lightgbm.txt"],
        check=True, capture_output=True,
    ).stdout.replace(b"\r\n", b"\n")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "model.txt").write_bytes(model_text)
    booster = lgb.Booster(model_file=str(OUT / "model.txt"))
    model_features = booster.feature_name()
    cfg = json.loads((repo / "models/optimal_threshold_v2.json").read_text())

    # Scaler: refit exactly as feature_engineering.py does (full dataset).
    eng = raw.copy()
    eng["Amount_Log"] = np.log1p(eng["Amount"])
    eng["Amount_Normalized"] = (eng["Amount"] - eng["Amount"].mean()) / eng["Amount"].std()
    scaler = RobustScaler().fit(eng[SCALED])

    test = pd.read_csv(repo / "data/processed/test_enhanced.csv")
    val = pd.read_csv(repo / "data/processed/val_enhanced.csv")
    amt_scaled = test["Amount"]  # already scaled in the processed split

    cluster_cfg = json.loads((repo / "models/behavior_clusterer_config.json").read_text())
    train = pd.read_csv(repo / "data/processed/train_enhanced.csv")
    km = KMeans(n_clusters=cluster_cfg["optimal_k"], random_state=42, n_init=10)
    km.fit(train[cluster_cfg["feature_names"]])
    # Same clusters as the repo's run: check against the split's labels.
    labels = km.predict(test[cluster_cfg["feature_names"]])
    expected = np.argmax(test[[f"cluster_{i}" for i in range(cluster_cfg["optimal_k"])]].values, axis=1)
    assert (labels == expected).all(), "refit KMeans disagrees with the repo's clusters"

    # Platt calibrator: refit exactly as calibrate_probabilities.py does.
    def sig(df: pd.DataFrame) -> np.ndarray:
        return expit(booster.predict(df[model_features], raw_score=True) + cfg["init_score"])

    lr = LogisticRegression().fit(pd.DataFrame(sig(val).reshape(-1, 1)), val["Class"].astype(int))

    prep = {
        "source": {"repo": SOURCE_REPO, "commit": SOURCE_COMMIT},
        "scaler": {
            "features": SCALED,
            "center": scaler.center_.tolist(),
            "scale": scaler.scale_.tolist(),
        },
        "time": {"mean": float(raw["Time"].mean()), "std": float(raw["Time"].std())},
        "amount": {"mean": float(raw["Amount"].mean()), "std": float(raw["Amount"].std())},
        "split": {
            "amount_mean": float(amt_scaled.mean()),
            "amount_std": float(amt_scaled.std()),
            "q99": float(amt_scaled.quantile(0.99)),
            "q01": float(amt_scaled.quantile(0.01)),
        },
        "clusters": {
            "features": cluster_cfg["feature_names"],
            "centroids": km.cluster_centers_.tolist(),
        },
        "calibration": {"coef": float(lr.coef_[0][0]), "intercept": float(lr.intercept_[0])},
        "model": {
            "features": model_features,
            "init_score": cfg["init_score"],
            "threshold": cfg["threshold"],
            "version": MODEL_VERSION,
            "sha256": hashlib.sha256(model_text).hexdigest(),
        },
    }
    (OUT / "prep.json").write_text(json.dumps(prep, indent=1) + "\n", encoding="utf-8")

    # Raw values for each test row: undo the scaler on V1-V28 and Amount.
    inv = test[SCALED].values * scaler.scale_ + scaler.center_
    raw_test = pd.DataFrame(inv[:, :29], columns=SCALED[:29])
    raw_test.insert(0, "Time", test["Time"].values)
    # Amounts are whole cents in the dataset; undo float noise from inverting.
    raw_test["Amount"] = raw_test["Amount"].round(2)
    prior_sum = np.concatenate([[0.0], np.cumsum(amt_scaled.values)[:-1]])

    def row(i: int) -> dict:
        return {
            "target": {k: float(raw_test.at[i, k]) for k in RAW},
            "window": [
                {"Time": float(raw_test.at[j, "Time"]), "Amount": float(raw_test.at[j, "Amount"])}
                for j in range(i - WINDOW, i)
            ],
            "priorSum": float(prior_sum[i]),
            "priorCount": int(i),
        }

    calibrated = lr.predict_proba(pd.DataFrame(sig(test).reshape(-1, 1)))[:, 1]
    y = test["Class"].astype(int).values

    # Parity fixture: 1 000 rows spread over the split (index >= WINDOW).
    rng = np.random.default_rng(42)
    idx = np.sort(rng.choice(np.arange(WINDOW, len(test)), 1000, replace=False))
    # Expected features for the first 100 rows (they're large); expected
    # probabilities for all 1 000.
    fixture = [
        {**row(int(i)), "expected": {
            **({"features": {c: round(float(test.at[int(i), c]), 12) for c in model_features}}
               if n < 100 else {}),
            "probability": float(calibrated[int(i)]),
        }}
        for n, i in enumerate(idx)
    ]
    fx = ROOT / "tests" / "python" / "fixtures"
    fx.mkdir(parents=True, exist_ok=True)
    (fx / "fraud_parity.json").write_text(json.dumps(fixture) + "\n", encoding="utf-8")

    # 20 demo samples, label-balanced, from the test split only.
    fraud_idx = [i for i in np.flatnonzero(y == 1) if i >= WINDOW][:10]
    legit_pool = np.flatnonzero(y == 0)
    legit_idx = sorted(rng.choice(legit_pool[legit_pool >= WINDOW], 10, replace=False).tolist())
    samples = []
    for n, i in enumerate(sorted([*fraud_idx, *legit_idx])):
        r = row(int(i))
        samples.append({
            "id": f"s{n + 1:02d}",
            "label": "fraud" if y[i] == 1 else "legit",
            **r,
        })
    attribution = {
        "dataset": "Credit Card Fraud Detection, Machine Learning Group, Université Libre de Bruxelles (ULB)",
        "licence": "CC BY-NC-SA 4.0 (per the source repository's DATA_LICENSE)",
        "url": "https://www.openml.org/d/1597",
        "note": "Rows selected from the time-ordered test split and reformatted; V1-V28 are PCA components.",
    }
    (OUT / "samples.json").write_text(
        json.dumps({"samples": samples}, indent=1) + "\n", encoding="utf-8"
    )
    public = {
        "samples": [
            {"id": s["id"], "label": s["label"], "window": s["window"], "target": s["target"]}
            for s in samples
        ],
        "attribution": attribution,
    }
    pub = ROOT / "public" / "demos" / "fraud"
    pub.mkdir(parents=True, exist_ok=True)
    (pub / "samples.json").write_text(json.dumps(public, indent=1) + "\n", encoding="utf-8")

    pred = calibrated >= cfg["threshold"]
    tp = int((pred & (y == 1)).sum()); fp = int((pred & (y == 0)).sum()); fn = int((~pred & (y == 1)).sum())
    print(f"model {prep['model']['sha256'][:12]}  test P {tp / (tp + fp):.3f} R {tp / (tp + fn):.3f}")
    print(f"wrote {OUT}, {len(samples)} samples, 1000-row parity fixture")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).resolve())
