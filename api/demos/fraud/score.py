"""POST /api/demos/fraud/score (docs/05 §5, task 4.2).

Scores one transaction from a served sample: the visitor may edit the target
transaction's Time, V1-V28 and Amount; its 10-transaction window and running
totals are loaded here from the sample, never taken from the client.
"""

from __future__ import annotations

import json
import math
import sys
import time
from functools import lru_cache
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from _lib import fraud  # noqa: E402
from _lib.http import client_ip, rate_limited, send_json  # noqa: E402

MAX_BYTES = 4 * 1024
LIMIT, WINDOW = 30, 600  # 30 requests per 10 minutes per IP (02 §5)
RANGES = {
    "Time": (0.0, 172_800.0),
    "Amount": (0.0, 30_000.0),
    **{f"V{i}": (-100.0, 100.0) for i in range(1, 29)},
}


@lru_cache(maxsize=1)
def booster():
    import lightgbm as lgb  # imported lazily: keeps validation errors fast

    return lgb.Booster(model_file=str(fraud.DATA_DIR / "model.txt"))


@lru_cache(maxsize=1)
def samples() -> dict[str, dict]:
    data = json.loads((fraud.DATA_DIR / "samples.json").read_text(encoding="utf-8"))
    return {s["id"]: s for s in data["samples"]}


def validate(body: object) -> tuple[dict | None, dict[str, str]]:
    errors: dict[str, str] = {}
    if not isinstance(body, dict):
        return None, {"body": "must be a JSON object"}
    extra = set(body) - {"sampleId", "features"}
    for key in sorted(extra):
        errors[key] = "is not allowed"
    sample_id = body.get("sampleId")
    if not isinstance(sample_id, str) or sample_id not in samples():
        errors["sampleId"] = "must be one of the served samples"
    feats = body.get("features")
    if not isinstance(feats, dict):
        errors["features"] = "must be an object"
        return None, errors
    for key in sorted(set(feats) - set(RANGES)):
        errors[f"features.{key}"] = "is not allowed"
    clean: dict[str, float] = {}
    for key, (lo, hi) in RANGES.items():
        value = feats.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            errors[f"features.{key}"] = "must be a number"
        elif not math.isfinite(value):
            errors[f"features.{key}"] = "must be finite"
        elif value < lo:
            errors[f"features.{key}"] = f"must be ≥ {lo:g}"
        elif value > hi:
            errors[f"features.{key}"] = f"must be ≤ {hi:g}"
        else:
            clean[key] = float(value)
    if errors:
        return None, errors
    return {"sampleId": sample_id, "features": clean}, {}


def score(sample_id: str, target: dict[str, float]) -> dict:
    started = time.perf_counter()
    s = samples()[sample_id]
    f = fraud.features(target, s["window"], s["priorSum"], s["priorCount"])
    x = fraud.vector(f)
    b = booster()
    t0 = time.perf_counter()
    raw = float(b.predict(x, raw_score=True)[0])
    model_ms = (time.perf_counter() - t0) * 1000
    contrib = b.predict(x, pred_contrib=True)[0][:-1]  # last column is the bias
    names = fraud.prep().model_features
    order = sorted(range(len(names)), key=lambda i: -abs(contrib[i]))[:5]
    p = fraud.prep()
    margin_probability = 1.0 / (1.0 + math.exp(-(raw + p.init_score)))
    calibrated = fraud.calibrated(raw)
    return {
        # sigmoid(raw margin + init_score): the focal-loss model's probability.
        "probability": round(margin_probability, 6),
        # The repo's Platt calibration of that value; the threshold applies here.
        "calibratedProbability": round(calibrated, 6),
        "threshold": p.threshold,
        "decision": "flag" if calibrated >= p.threshold else "allow",
        "topContributions": [
            {
                "feature": names[i],
                "logOdds": round(float(contrib[i]), 4),
                "direction": "fraud" if contrib[i] > 0 else "legit",
            }
            for i in order
        ],
        "modelVersion": p.model_version,
        "latencyMs": {
            "model": round(model_ms, 2),
            "total": round((time.perf_counter() - started) * 1000, 2),
        },
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 (http.server API)
        try:
            if not self.headers.get("content-type", "").startswith("application/json"):
                send_json(self, 415, {"error": "unsupported_media_type"})
                return
            length = int(self.headers.get("content-length") or 0)
            if length > MAX_BYTES:
                send_json(self, 413, {"error": "too_large"})
                return
            wait = rate_limited("fraud", client_ip(self), LIMIT, WINDOW)
            if wait:
                send_json(
                    self, 429, {"error": "rate_limited", "retryAfterSeconds": wait},
                    {"Retry-After": str(wait)},
                )
                return
            try:
                body = json.loads(self.rfile.read(length) or b"null")
            except (ValueError, UnicodeDecodeError):
                send_json(self, 400, {"error": "validation", "fields": {"body": "is not valid JSON"}})
                return
            req, errors = validate(body)
            if errors:
                send_json(self, 400, {"error": "validation", "fields": errors})
                return
            send_json(self, 200, score(req["sampleId"], req["features"]))
        except Exception:
            # No stack trace or model path leaves the function (07 item 23).
            send_json(self, 500, {"error": "internal"})

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return
