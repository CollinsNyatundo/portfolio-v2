"""Tests for the fraud scoring function (tasks 4.1-4.3).

Run: npm run test:py
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import sys
from email.message import Message
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "api"
sys.path.insert(0, str(API))

from _lib import fraud  # noqa: E402
from _lib import http as http_lib  # noqa: E402

sys.path.insert(0, str(API / "demos" / "fraud"))
import score as score_fn  # noqa: E402

FIXTURE = json.loads((ROOT / "tests/python/fixtures/fraud_parity.json").read_text())
PUBLIC = json.loads((ROOT / "public/demos/fraud/samples.json").read_text())


def call(body, *, ctype="application/json", ip="203.0.113.20", raw: bytes | None = None):
    data = raw if raw is not None else json.dumps(body).encode()
    h = score_fn.handler.__new__(score_fn.handler)
    h.path = "/api/demos/fraud/score"
    h.client_address = (ip, 0)
    h.headers = Message()
    h.headers["content-type"] = ctype
    h.headers["content-length"] = str(len(data))
    h.headers["x-forwarded-for"] = ip
    h.rfile = io.BytesIO(data)
    h.wfile = io.BytesIO()
    status: dict = {}
    headers: dict = {}
    h.send_response = lambda code, msg=None: status.setdefault("code", code)
    h.send_header = lambda k, v: headers.__setitem__(k, v)
    h.end_headers = lambda: None
    h.do_POST()
    return status["code"], json.loads(h.wfile.getvalue()), headers


@pytest.fixture(autouse=True)
def fresh_limiter(monkeypatch):
    monkeypatch.delenv("UPSTASH_REDIS_REST_URL", raising=False)
    http_lib._local.clear()


def a_sample():
    s = PUBLIC["samples"][0]
    return {"sampleId": s["id"], "features": dict(s["target"])}


# ── 4.1 parity with the repo pipeline ───────────────────────────────────


def test_probabilities_match_the_repo_on_1000_test_rows():
    worst = 0.0
    for r in FIXTURE:
        f = fraud.features(r["target"], r["window"], r["priorSum"], r["priorCount"])
        raw = score_fn.booster().raw(fraud.vector(f)[0].tolist())
        worst = max(worst, abs(fraud.calibrated(raw) - r["expected"]["probability"]))
    assert len(FIXTURE) == 1000
    assert worst < 1e-9


def test_features_match_the_repo():
    # pandas' rolling variance carries float noise (up to ~1e-6 on scaled
    # amounts); everything else agrees to 1e-9.
    checked = 0
    for r in FIXTURE:
        expected = r["expected"].get("features")
        if not expected:
            continue
        f = fraud.features(r["target"], r["window"], r["priorSum"], r["priorCount"])
        for k, v in expected.items():
            assert math.isclose(f[k], v, rel_tol=1e-5, abs_tol=1e-5), (k, f[k], v)
        checked += 1
    assert checked == 100


def test_pure_python_scorer_matches_lightgbm():
    # lightgbm is the reference here only; the function never imports it.
    lgb = pytest.importorskip("lightgbm")
    import numpy as np

    ref = lgb.Booster(model_file=str(fraud.DATA_DIR / "model.txt"))
    model = score_fn.booster()
    assert model.feature_names == ref.feature_name()
    for r in FIXTURE[:150]:
        x = fraud.vector(fraud.features(r["target"], r["window"], r["priorSum"], r["priorCount"]))
        assert abs(model.raw(x[0].tolist()) - float(ref.predict(x, raw_score=True)[0])) < 1e-9
        np.testing.assert_allclose(
            model.contributions(x[0].tolist()), ref.predict(x, pred_contrib=True)[0], atol=1e-9
        )


def test_function_does_not_import_lightgbm():
    text = (API / "demos" / "fraud" / "score.py").read_text(encoding="utf-8")
    assert "import lightgbm" not in text


def test_model_file_matches_its_recorded_hash():
    digest = hashlib.sha256((fraud.DATA_DIR / "model.txt").read_bytes()).hexdigest()
    assert digest == json.loads((fraud.DATA_DIR / "prep.json").read_text())["model"]["sha256"]


def test_no_pickle_anywhere_in_the_function():
    for path in [*API.rglob("*.py")]:
        text = path.read_text(encoding="utf-8")
        assert "pickle" not in text.replace("no pickle", "").replace("No pickle", "")
        assert "joblib" not in text
    assert not list((API / "_data").rglob("*.pkl"))


# ── 4.3 samples ─────────────────────────────────────────────────────────


def test_twenty_label_balanced_samples_with_windows_and_credit():
    samples = PUBLIC["samples"]
    assert len(samples) == 20
    assert sum(s["label"] == "fraud" for s in samples) == 10
    for s in samples:
        assert len(s["window"]) == 10
        assert set(s["target"]) == set(fraud.RAW_FEATURES)
        assert "priorSum" not in s  # server-side only
    assert "CC BY-NC-SA 4.0" in PUBLIC["attribution"]["licence"]


# ── 4.2 the function ────────────────────────────────────────────────────


def test_scores_a_sample():
    code, body, headers = call(a_sample())
    assert code == 200
    assert set(body) == {
        "probability", "calibratedProbability", "threshold", "decision",
        "topContributions", "modelVersion", "latencyMs",
    }
    assert body["decision"] == ("flag" if body["calibratedProbability"] >= body["threshold"] else "allow")
    assert len(body["topContributions"]) == 5
    mags = [abs(c["logOdds"]) for c in body["topContributions"]]
    assert mags == sorted(mags, reverse=True)
    assert body["latencyMs"]["model"] <= body["latencyMs"]["total"]
    assert headers["Content-Type"].startswith("application/json")


def test_fraud_samples_mostly_flag_and_legit_mostly_allow():
    flagged = {"fraud": 0, "legit": 0}
    for s in PUBLIC["samples"]:
        _, body, _ = call({"sampleId": s["id"], "features": s["target"]}, ip=f"10.0.0.{s['id'][1:]}")
        flagged[s["label"]] += body["decision"] == "flag"
    assert flagged["fraud"] >= 6 and flagged["legit"] <= 2


def test_editing_the_amount_changes_the_score():
    req = a_sample()
    _, before, _ = call(req)
    req["features"]["Amount"] = 2999.0
    _, after, _ = call(req, ip="203.0.113.21")
    assert after["probability"] != before["probability"]


@pytest.mark.parametrize(
    "mutate,field",
    [
        (lambda r: r["features"].__setitem__("Amount", 30001), "features.Amount"),
        (lambda r: r["features"].__setitem__("Amount", -1), "features.Amount"),
        (lambda r: r["features"].__setitem__("V3", 101), "features.V3"),
        (lambda r: r["features"].__setitem__("Time", "noon"), "features.Time"),
        (lambda r: r["features"].__setitem__("V1", True), "features.V1"),
        (lambda r: r["features"].pop("V28"), "features.V28"),
        (lambda r: r["features"].__setitem__("amt_mean_3", 1), "features.amt_mean_3"),
        (lambda r: r.__setitem__("window", []), "window"),
        (lambda r: r.__setitem__("sampleId", "s99"), "sampleId"),
    ],
)
def test_validation_errors_name_the_field(mutate, field):
    req = a_sample()
    mutate(req)
    code, body, _ = call(req)
    assert code == 400 and body["error"] == "validation"
    assert field in body["fields"]


def test_non_finite_numbers_are_rejected():
    raw = json.dumps(a_sample()).replace('"Amount": ', '"Amount": NaN, "x": ', 1).encode()
    code, body, _ = call(None, raw=raw)
    assert code == 400


def test_wrong_content_type_and_large_bodies():
    assert call(a_sample(), ctype="text/plain")[0] == 415
    assert call(None, raw=b"{" + b" " * 5000 + b"}")[0] == 413
    assert call(None, raw=b"{not json")[0] == 400


def test_rate_limit_30_per_10_minutes():
    for _ in range(30):
        assert call(a_sample(), ip="198.51.100.30")[0] == 200
    code, body, headers = call(a_sample(), ip="198.51.100.30")
    assert code == 429 and headers["Retry-After"] == str(body["retryAfterSeconds"])


def test_internal_errors_hide_details(monkeypatch):
    def boom(*_a):
        raise RuntimeError("/var/task/api/_data/fraud/model.txt corrupt")

    monkeypatch.setattr(score_fn, "score", boom)
    code, body, _ = call(a_sample())
    assert code == 500 and body == {"error": "internal"}
