"""Minimal Supabase (PostgREST) client using only the standard library.

Used by run_site.py with the service key, so it can write past row-level security.
Never ship the service key to the browser; the web app uses the anon key (read-only).
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone


class Supabase:
    def __init__(self, url: str, service_key: str):
        # Secrets pasted into GitHub often carry a trailing newline or space, which breaks the URL.
        url, service_key = url.strip(), service_key.strip()
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        }

    @classmethod
    def from_env(cls) -> "Supabase":
        return cls(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

    def _request(self, method: str, path: str, body=None, extra: dict | None = None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            f"{self.base}/{path}", data=data, method=method, headers={**self.headers, **(extra or {})}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
        return json.loads(raw) if raw else None

    def get_site(self, site_id: str) -> dict | None:
        rows = self._request("GET", f"sites?id=eq.{urllib.parse.quote(site_id)}&select=*")
        return rows[0] if rows else None

    def upsert(self, table: str, key: str, row: dict) -> None:
        self._request(
            "POST",
            f"{table}?on_conflict={key}",
            row,
            {"Prefer": "resolution=merge-duplicates,return=minimal"},
        )

    def set_status(self, site_id: str, status: str, error: str | None = None) -> None:
        self._request(
            "PATCH",
            f"sites?id=eq.{urllib.parse.quote(site_id)}",
            {
                "satellite_status": status,
                "error": error,
                "rejected_at": datetime.now(timezone.utc).isoformat() if status == "rejected" else None,
            },
            {"Prefer": "return=minimal"},
        )
