"""Shared plumbing for the demo functions: JSON responses and rate limits.

Rate limits use Upstash Redis when its REST credentials are set (02 §5):
UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or the KV_REST_API_URL +
KV_REST_API_TOKEN pair the Vercel Marketplace integration provisions. They
fall back to an in-process window
otherwise, which only limits one warm instance. Both are fixed windows.
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler

_lock = threading.Lock()
_local: dict[str, tuple[int, float]] = {}
# Used only when Redis is unavailable; never leaves the process.
_process_salt = secrets.token_hex(16)


def client_ip(handler: BaseHTTPRequestHandler) -> str:
    # Vercel sets x-forwarded-for; its first entry is the client.
    forwarded = handler.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or handler.client_address[0]


def hash_ip(ip: str, salt: str) -> str:
    """SHA-256 of salt + IP: Redis never holds a raw address (02 §6, 07 item 55)."""
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:32]


def _upstash_credentials() -> tuple[str, str] | None:
    """A complete URL + token pair; explicit UPSTASH_* names win. Mirrors lib/upstash-env.ts."""
    for url_key, token_key in (
        ("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"),
        ("KV_REST_API_URL", "KV_REST_API_TOKEN"),
    ):
        url = (os.environ.get(url_key) or "").strip()
        token = (os.environ.get(token_key) or "").strip()
        if url and token:
            return url, token
    return None


def _upstash(commands: list[list[str]]) -> list | None:
    creds = _upstash_credentials()
    if creds is None:
        return None
    url, token = creds
    req = urllib.request.Request(
        f"{url.rstrip('/')}/multi-exec",
        data=json.dumps(commands).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=1.5) as res:  # noqa: S310 (fixed host from env)
            return [r["result"] for r in json.loads(res.read())]
    except Exception:
        return None  # fall back to the in-process limiter, never to no limit


def _daily_salt() -> str | None:
    """A random salt per UTC day, shared by all instances through Redis."""
    day = time.strftime("%Y-%m-%d", time.gmtime())
    key = f"salt:{day}"
    out = _upstash([["SET", key, secrets.token_hex(16), "NX", "EX", "90000"], ["GET", key]])
    return str(out[1]) if out else None


def _upstash_incr(name: str, ip: str, bucket: int, window: int) -> int | None:
    salt = _daily_salt()
    if salt is None:
        return None
    key = f"rl:{name}:{hash_ip(ip, salt)}:{bucket}"
    out = _upstash([["INCR", key], ["EXPIRE", key, str(window), "NX"]])
    return int(out[0]) if out else None


def rate_limited(name: str, ip: str, limit: int, window: int) -> int:
    """Seconds to wait if over the limit, else 0."""
    now = time.time()
    bucket = int(now // window)
    count = _upstash_incr(name, ip, bucket, window)
    if count is None:
        key = f"rl:{name}:{hash_ip(ip, _process_salt)}:{bucket}"
        with _lock:
            prev, _ = _local.get(key, (0, now))
            count = prev + 1
            _local[key] = (count, now)
            for k in [k for k, (_, t) in _local.items() if now - t > window * 2]:
                del _local[k]
    if count > limit:
        return int(window - (now % window)) + 1
    return 0


def send_json(
    handler: BaseHTTPRequestHandler,
    status: int,
    payload: dict,
    extra_headers: dict[str, str] | None = None,
) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    for k, v in (extra_headers or {}).items():
        handler.send_header(k, v)
    handler.end_headers()
    handler.wfile.write(body)
