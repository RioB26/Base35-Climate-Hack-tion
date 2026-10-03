"""Run the satellite screening for one site stored in Supabase and write the results back.

Triggered by the GitHub Action (satellite.yml) after the add-site Edge Function inserts a row.

Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... EE_PROJECT=... \\
    EE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}' \\
    python run_site.py --site ID [--start 2024-10-01 --end 2025-10-01]

Without EE_SERVICE_ACCOUNT_KEY it falls back to your local `earthengine authenticate` login.
The window defaults to the trailing 12 months.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import date, timedelta

from satellite import run_site as screen_site
from supabase_io import Supabase


def init_earth_engine():
    import ee

    project = os.environ["EE_PROJECT"]
    key = os.environ.get("EE_SERVICE_ACCOUNT_KEY")
    if key:
        info = json.loads(key)
        ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=project)
    else:
        ee.Initialize(project=project)
    return ee


def process(db, ee, site_id: str, start: str, end: str) -> bool:
    """Screen one site and record the outcome. Returns True on success; failures are recorded, not raised."""
    site = db.get_site(site_id)
    if site is None:
        raise SystemExit(f"site {site_id!r} not found")
    db.set_status(site_id, "running")
    try:
        result, grid = screen_site(ee, site, start, end)
        db.upsert("satellite_results", "site_id", {"site_id": site_id, "data": result})
        db.upsert("methane_grid", "site_id", {"site_id": site_id, "data": grid})
    except Exception as e:  # noqa: BLE001 - any failure must reach the UI instead of leaving "running"
        db.set_status(site_id, "failed", f"{type(e).__name__}: {e}"[:500])
        return False
    db.set_status(site_id, "done")
    return True


def main() -> None:
    today = date.today()
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--start", default=(today - timedelta(days=365)).isoformat())
    ap.add_argument("--end", default=today.isoformat())
    args = ap.parse_args()

    ok = process(Supabase.from_env(), init_earth_engine(), args.site, args.start, args.end)
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
