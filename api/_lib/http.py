"""Shared plumbing for the demo functions: JSON responses and rate limits.

Rate limits use Upstash Redis when UPSTASH_REDIS_REST_URL and
UPSTASH_REDIS_REST_TOKEN are set (02 §5), and an in-process window
otherwise, which only limits one warm instance. Both are fixed windows.
"""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler

_lock = threading.Lock()
_local: dict[str, tuple[int, float]] = {}


def client_ip(handler: BaseHTTPRequestHandler) -> str:
    # Vercel sets x-forwarded-for; its first entry is the client.
    forwarded = handler.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or handler.client_address[0]


def _upstash_incr(key: str, window: int) -> int | None:
    url = os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        return None
    body = json.dumps([["INCR", key], ["EXPIRE", key, str(window), "NX"]]).encode()
    req = urllib.request.Request(
        f"{url.rstrip('/')}/multi-exec",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=1.5) as res:  # noqa: S310 (fixed host from env)
            return int(json.loads(res.read())[0]["result"])
    except Exception:
        return None  # fail open to the in-process limiter, never to no limit


def rate_limited(name: str, ip: str, limit: int, window: int) -> int:
    """Seconds to wait if over the limit, else 0."""
    now = time.time()
    bucket = int(now // window)
    key = f"rl:{name}:{ip}:{bucket}"
    count = _upstash_incr(key, window)
    if count is None:
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
