"""GET /api/demos/mlsys/search?q=<text>&limit=<1..10> (docs/05 §5)."""

from __future__ import annotations

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from _lib.http import client_ip, rate_limited, send_json  # noqa: E402
from _lib.mlsys import ATTRIBUTION, ValidationError, parse_limit, parse_query, search  # noqa: E402

LIMIT, WINDOW = 60, 600  # 60 requests per 10 minutes per IP (02 §5)


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 (http.server API)
        try:
            wait = rate_limited("mlsys", client_ip(self), LIMIT, WINDOW)
            if wait:
                send_json(
                    self,
                    429,
                    {"error": "rate_limited", "retryAfterSeconds": wait},
                    {"Retry-After": str(wait)},
                )
                return
            params = parse_qs(urlparse(self.path).query, keep_blank_values=True)
            q = params.get("q", [None])[0]
            limit = params.get("limit", [None])[0]
            try:
                text = parse_query(q)
                count = parse_limit(limit)
            except ValidationError as err:
                send_json(self, 400, {"error": "validation", "fields": {err.field: err.message}})
                return
            send_json(self, 200, {"results": search(text, count), "attribution": ATTRIBUTION})
        except Exception:
            # No stack trace or file path leaves the function (07 item 23).
            send_json(self, 500, {"error": "internal"})

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return  # queries stay out of logs (02 §5: no PII stored)
