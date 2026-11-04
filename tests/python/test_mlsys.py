"""Tests for the ML Systems search function (task 4.5).

Run: npm run test:py
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
from email.message import Message
from pathlib import Path

import pytest

API = Path(__file__).resolve().parents[2] / "api"
sys.path.insert(0, str(API))

from _lib import http as http_lib  # noqa: E402
from _lib import mlsys  # noqa: E402

sys.path.insert(0, str(API / "demos" / "mlsys"))
import search as search_fn  # noqa: E402

INJECTIONS = [
    '"; DROP TABLE chunk_fts; --',
    "data NEAR drift",
    "data* OR 1=1",
    "heading:secret",
    "(((((",
    "^^^ :: **",
    "' OR ''='",
    "<script>alert(1)</script>",
    "NOT AND OR",
    "x" * 200,
]


def call(path: str, ip: str = "203.0.113.7") -> tuple[int, dict, dict]:
    """Drive the handler class without a socket."""
    h = search_fn.handler.__new__(search_fn.handler)
    h.path = path
    h.client_address = (ip, 0)
    h.headers = Message()
    h.headers["x-forwarded-for"] = ip
    h.wfile = io.BytesIO()
    status: dict = {}
    headers: dict = {}
    h.send_response = lambda code, msg=None: status.setdefault("code", code)
    h.send_header = lambda k, v: headers.__setitem__(k, v)
    h.end_headers = lambda: None
    h.do_GET()
    return status["code"], json.loads(h.wfile.getvalue()), headers


@pytest.fixture(autouse=True)
def fresh_limiter(monkeypatch):
    monkeypatch.delenv("UPSTASH_REDIS_REST_URL", raising=False)
    http_lib._local.clear()


def test_index_matches_its_manifest():
    manifest = json.loads((mlsys.DATA_DIR / "mlsys.json").read_text())
    assert hashlib.sha256(mlsys.DB_PATH.read_bytes()).hexdigest() == manifest["sha256"]


def test_returns_ranked_results_with_attribution():
    code, body, headers = call("/api/demos/mlsys/search?q=data%20drift&limit=5")
    assert code == 200
    assert 1 <= len(body["results"]) <= 5
    first = body["results"][0]
    assert set(first) == {"chapter", "section", "snippet", "url", "score"}
    assert first["url"].startswith(
        "https://github.com/CollinsNyatundo/machine-learning-systems-plugin/blob/"
    )
    assert body["attribution"]["licence"] == "CC BY-NC-SA 4.0"
    assert headers["Content-Type"].startswith("application/json")


@pytest.mark.parametrize("q", INJECTIONS)
def test_injection_strings_return_200_never_500(q):
    from urllib.parse import quote

    code, body, _ = call(f"/api/demos/mlsys/search?q={quote(q)}")
    assert code in (200, 400)
    assert "results" in body or body["error"] == "validation"


def test_index_survives_injection_attempts():
    call('/api/demos/mlsys/search?q=%22%3B%20DROP%20TABLE%20chunk_fts%3B%20--')
    code, body, _ = call("/api/demos/mlsys/search?q=quantization")
    assert code == 200 and body["results"]


@pytest.mark.parametrize(
    "path,field",
    [
        ("/api/demos/mlsys/search", "q"),
        ("/api/demos/mlsys/search?q=ab", "q"),
        ("/api/demos/mlsys/search?q=" + "a" * 201, "q"),
        ("/api/demos/mlsys/search?q=drift&limit=0", "limit"),
        ("/api/demos/mlsys/search?q=drift&limit=11", "limit"),
        ("/api/demos/mlsys/search?q=drift&limit=abc", "limit"),
    ],
)
def test_validation_errors(path, field):
    code, body, _ = call(path)
    assert code == 400
    assert body["error"] == "validation" and field in body["fields"]


def test_no_match_is_an_empty_list():
    code, body, _ = call("/api/demos/mlsys/search?q=zzqxjv%20wqpzzk")
    assert code == 200 and body["results"] == []


def test_rate_limit_after_60_requests_in_the_window():
    for _ in range(60):
        assert call("/api/demos/mlsys/search?q=drift", ip="198.51.100.9")[0] == 200
    code, body, headers = call("/api/demos/mlsys/search?q=drift", ip="198.51.100.9")
    assert code == 429
    assert body["error"] == "rate_limited" and body["retryAfterSeconds"] > 0
    assert headers["Retry-After"] == str(body["retryAfterSeconds"])
    # Another visitor is unaffected.
    assert call("/api/demos/mlsys/search?q=drift", ip="198.51.100.10")[0] == 200


def test_internal_errors_hide_details(monkeypatch):
    def boom(*_args):
        raise RuntimeError(r"C:\secret\path\mlsys.db is locked")

    monkeypatch.setattr(search_fn, "search", boom)
    code, body, _ = call("/api/demos/mlsys/search?q=drift")
    assert code == 500 and body == {"error": "internal"}


def test_redis_keys_never_hold_the_raw_ip(monkeypatch):
    sent: list = []

    def fake_upstash(commands):
        sent.append(commands)
        if commands[0][0] == "SET":
            return ["OK", "salt-for-today"]
        return [1, 1]

    monkeypatch.setattr(http_lib, "_upstash", fake_upstash)
    assert http_lib.rate_limited("mlsys", "203.0.113.77", 60, 600) == 0
    flat = json.dumps(sent)
    assert "203.0.113.77" not in flat
    assert http_lib.hash_ip("203.0.113.77", "salt-for-today") in flat


def test_fts_match_keeps_only_quoted_words():
    assert mlsys.fts_match('a "b" NEAR(c) OR d*', "and") == '"a" "b" "near" "c" "or" "d"*'
    assert mlsys.fts_match("!!!", "and") is None


def test_snippets_mark_matches_with_control_characters():
    _, body, _ = call("/api/demos/mlsys/search?q=quantization")
    snippet = body["results"][0]["snippet"]
    assert mlsys.MARK_OPEN in snippet and mlsys.MARK_CLOSE in snippet
