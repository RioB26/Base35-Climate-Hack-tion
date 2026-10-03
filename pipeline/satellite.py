"""Precompute the satellite screening signal for each site into web/src/data/satellite.json,
plus a mean-methane grid around each site for the map (web/src/data/methaneGrid.json).

Uses Google Earth Engine: Sentinel-5P L3 CH4 overpasses plus ERA5-Land wind at the
overpass hour. The statistic itself lives in sector_analysis.py.

Usage:
    pip install -r requirements.txt
    earthengine authenticate
    python satellite.py --project YOUR_GCP_PROJECT --start 2024-10-01 --end 2025-10-01 [--site ID]

VERIFY before relying on results: dataset ids and band names below, and that the
ERA5 hour matched to each overpass is sensible for the site's time zone.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from pathlib import Path

from sector_analysis import Overpass, Pixel, Settings, classify, classify_periods, mean_grid

ROOT = Path(__file__).resolve().parent.parent
SITES = ROOT / "web" / "src" / "data" / "sites.json"
OUT = ROOT / "web" / "src" / "data" / "satellite.json"
GRID_OUT = ROOT / "web" / "src" / "data" / "methaneGrid.json"

S5P = "COPERNICUS/S5P/OFFL/L3_CH4"
S5P_BAND = "CH4_column_volume_mixing_ratio_dry_air_bias_corrected"
ERA5 = "ECMWF/ERA5_LAND/HOURLY"
SAMPLE_SCALE_M = 5500  # close to the native S5P pixel; avoids oversampling one pixel


def fetch_overpasses(ee, lat: float, lon: float, start: str, end: str, outer_km: float) -> list[Overpass]:
    site = ee.Geometry.Point([lon, lat])
    region = site.buffer(outer_km * 1000 + 5000)
    images = ee.ImageCollection(S5P).select(S5P_BAND).filterBounds(region)
    era5 = ee.ImageCollection(ERA5).select(["u_component_of_wind_10m", "v_component_of_wind_10m"])

    def per_image(img):
        t = ee.Date(img.get("system:time_start"))
        hour = era5.filterDate(t.update(minute=0, second=0), t.update(minute=0, second=0).advance(1, "hour")).first()
        wind = ee.Image(hour).reduceRegion(ee.Reducer.first(), site, 9000)
        samples = img.sample(region=region, scale=SAMPLE_SCALE_M, geometries=True, dropNulls=True)
        with_wind = samples.map(
            lambda f: f.set(
                {
                    "date": t.format("YYYY-MM-dd'T'HH:mm"),
                    "u": wind.get("u_component_of_wind_10m"),
                    "v": wind.get("v_component_of_wind_10m"),
                }
            )
        )
        # ERA5-Land lags real time by weeks; a pass with no wind hour yet is skipped, not fatal.
        return ee.FeatureCollection(ee.Algorithms.If(hour, with_wind, ee.FeatureCollection([])))

    overpasses: dict[str, Overpass] = {}
    # Monthly chunks keep each getInfo under Earth Engine's element limits.
    cur = date.fromisoformat(start)
    stop = date.fromisoformat(end)
    while cur < stop:
        nxt = min(stop, (cur.replace(day=1) + timedelta(days=32)).replace(day=1))
        fc = images.filterDate(cur.isoformat(), nxt.isoformat()).map(per_image).flatten()
        for f in fc.getInfo()["features"]:
            p = f["properties"]
            if p.get("u") is None or p.get("v") is None:
                continue
            lon_px, lat_px = f["geometry"]["coordinates"]
            op = overpasses.setdefault(p["date"], Overpass(p["date"], p["u"], p["v"]))
            op.pixels.append(Pixel(lat_px, lon_px, p[S5P_BAND]))
        print(f"  {cur:%Y-%m}: {len(overpasses)} overpasses so far")
        cur = nxt
    return list(overpasses.values())


def run_site(ee, site: dict, start: str, end: str, settings: Settings | None = None) -> tuple[dict, dict]:
    """Satellite screening result and mean-methane grid for one site."""
    settings = settings or Settings()
    ops = fetch_overpasses(ee, site["lat"], site["lon"], start, end, settings.outer_km)
    result = {
        **classify(site["lat"], site["lon"], ops, settings),
        "periods": classify_periods(site["lat"], site["lon"], ops, settings),
    }
    grid = {"windowStart": start, "windowEnd": end, "cells": mean_grid(ops)}
    return result, grid


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True, help="Google Cloud project registered for Earth Engine")
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--site", help="only run this site id")
    args = ap.parse_args()

    import ee

    ee.Initialize(project=args.project)
    sites = json.loads(SITES.read_text())
    results = json.loads(OUT.read_text()) if OUT.exists() else {}
    grids = json.loads(GRID_OUT.read_text()) if GRID_OUT.exists() else {}

    for site in sites:
        if args.site and site["id"] != args.site:
            continue
        print(f"{site['id']}: fetching overpasses")
        results[site["id"]], grids[site["id"]] = run_site(ee, site, args.start, args.end)
        print(f"  -> {results[site['id']]['status']} ({results[site['id']]['overpassesUsed']} usable)")

    OUT.write_text(json.dumps(results, indent=2) + "\n")
    GRID_OUT.write_text(json.dumps(grids) + "\n")
    print(f"wrote {OUT} and {GRID_OUT}")


if __name__ == "__main__":
    main()
