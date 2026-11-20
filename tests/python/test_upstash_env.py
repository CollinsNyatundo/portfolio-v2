"""Upstash credentials: both naming schemes, only as complete pairs (mirrors lib/upstash-env.ts)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

API = Path(__file__).resolve().parents[2] / "api"
sys.path.insert(0, str(API))

from _lib import http as http_lib  # noqa: E402

NAMES = (
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "KV_REST_API_READ_ONLY_TOKEN",
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in NAMES:
        monkeypatch.delenv(name, raising=False)


def test_upstash_names(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://a.upstash.io")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "tok-a")
    monkeypatch.setenv("KV_REST_API_URL", "https://b.upstash.io")
    monkeypatch.setenv("KV_REST_API_TOKEN", "tok-b")
    assert http_lib._upstash_credentials() == ("https://a.upstash.io", "tok-a")


def test_marketplace_names(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KV_REST_API_URL", " https://b.upstash.io ")
    monkeypatch.setenv("KV_REST_API_TOKEN", "tok-b")
    assert http_lib._upstash_credentials() == ("https://b.upstash.io", "tok-b")


def test_no_mixing_and_no_read_only_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://a.upstash.io")
    monkeypatch.setenv("KV_REST_API_READ_ONLY_TOKEN", "ro")
    assert http_lib._upstash_credentials() is None
