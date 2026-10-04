"""Run the satellite screening for one site stored in Supabase and write the results back.

Triggered by the GitHub Action (satellite.yml) after the add-site Edge Function inserts a row.

Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... EE_PROJECT=... \\
    EE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}' \\
    python run_site.py --site ID [--start 2024-10-01 --end 2025-10-01]

Without EE_SERVICE_ACCOUNT_KEY it falls back to your local `earthengine authenticate` login.
The window defaults to the 12 months ending 90 days ago, because ERA5 wind data lags real time.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import date, timedelta

from carbon_mapper import SOURCES_URL, get_json, plumes_for_site
from satellite import run_site as screen_site
from sector_analysis import Settings
from supabase_io import Supabase

ERA5_LAG_DAYS = 90
TANAGER_RADIUS_KM = 15


def collect_plumes(db, site: dict) -> None:
    """Search the Carbon Mapper catalog for plumes near the site. Best effort: a failure writes nothing,
    so the UI shows "not checked" rather than a false "no coverage", and never fails the site."""
    try:
        data = plumes_for_site(get_json(SOURCES_URL), site, TANAGER_RADIUS_KM)
        data.update(catalogCheckedAt=date.today().isoformat(), coverageRadiusKm=TANAGER_RADIUS_KM)
        db.upsert("tanager_results", "site_id", {"site_id": site["id"], "data": data})
    except Exception as e:  # noqa: BLE001
        print(f"plume search failed for {site['id']}: {type(e).__name__}: {e}")


def rejection_for(result: dict) -> str | None:
    """Why a screened site has too little usable satellite data to keep, or None if it is good enough.

    A noisy signal with enough overpasses is a valid "inconclusive" result and is kept.
    """
    used = result.get("overpassesUsed", 0)
    minimum = Settings().min_overpasses
    if used == 0:
        return (
            "We found no usable Sentinel-5P methane readings around these coordinates "
            "(for example cloud cover, or the pin is not on or near land). Check the latitude and longitude."
        )
    if used < minimum:
        return (
            f"We only found {used} usable satellite overpass{'es' if used != 1 else ''} in the last year "
            f"and need at least {minimum} to check this site reliably."
        )
    return None


def init_earth_engine():
    import ee

    project = os.environ["EE_PROJECT"].strip()
    key = (os.environ.get("EE_SERVICE_ACCOUNT_KEY") or "").strip()
    if key:
        info = json.loads(key)
        ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=key), project=project)
    else:
        ee.Initialize(project=project)
    return ee


def process(db, init_ee, site_id: str, start: str, end: str) -> bool:
    """Screen one site and record the outcome. Returns True when the outcome was recorded (done or rejected); failures are recorded, not raised.

    init_ee is called inside the guard so an Earth Engine auth failure is reported to the UI too.
    """
    site = db.get_site(site_id)
    if site is None:
        raise SystemExit(f"site {site_id!r} not found")
    db.set_status(site_id, "running")
    collect_plumes(db, site)  # first: it needs no Earth Engine auth, the most fragile part
    try:
        result, grid = screen_site(init_ee(), site, start, end)
        reason = rejection_for(result)
        if reason:
            # Not enough data to keep: nothing is stored, the app shows the reason and the site is removed.
            db.set_status(site_id, "rejected", reason)
            return True  # a handled outcome: exiting non-zero would make the workflow overwrite it with "failed"
        db.upsert("satellite_results", "site_id", {"site_id": site_id, "data": result})
        db.upsert("methane_grid", "site_id", {"site_id": site_id, "data": grid})
    except Exception as e:  # noqa: BLE001 - any failure must reach the UI instead of leaving "running"
        db.set_status(site_id, "failed", f"{type(e).__name__}: {e}"[:500])
        return False
    db.set_status(site_id, "done")
    return True


def main() -> None:
    end_default = date.today() - timedelta(days=ERA5_LAG_DAYS)
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--start", default=(end_default - timedelta(days=365)).isoformat())
    ap.add_argument("--end", default=end_default.isoformat())
    ap.add_argument("--fail", metavar="REASON", help="only mark the site failed (used by the workflow when the job dies early)")
    args = ap.parse_args()

    db = Supabase.from_env()
    if args.fail:
        db.set_status(args.site, "failed", args.fail[:500])
        raise SystemExit(0)
    ok = process(db, init_earth_engine, args.site, args.start, args.end)
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
