"""Refresh high-resolution Carbon Mapper/Tanager observations for every landfill.

This is a catalog ingestion step, not a tasking service. A site with no returned
record is written as ``no_public_coverage``; the script never treats that as a
negative methane result.

Usage:
    python carbon_mapper.py --radius 15
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SITES_PATH = ROOT / "web" / "src" / "data" / "sites.json"
OUTPUT_PATH = ROOT / "web" / "src" / "data" / "tanager.json"
SOURCES_URL = "https://api.carbonmapper.org/api/v1/catalog/sources.geojson?status=not_deleted"
PLUMES_URL = "https://api.carbonmapper.org/api/v1/catalog/plumes/annotated"


def get_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "Methane-Payback-data-refresh/1.0"})
    with urlopen(request, timeout=60) as response:
        return json.load(response)


def distance_km(lat: float, lon: float, other_lat: float, other_lon: float) -> float:
    x = math.radians(other_lon - lon) * math.cos(math.radians((lat + other_lat) / 2))
    y = math.radians(other_lat - lat)
    return math.sqrt(x * x + y * y) * 6371


def plume_ids_near_site(sources: dict, site: dict, radius_km: float) -> tuple[set[str], int]:
    ids: set[str] = set()
    clusters = 0
    for feature in sources.get("features", []):
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        properties = feature.get("properties") or {}
        if len(coordinates) < 2 or properties.get("gas") != "CH4":
            continue
        if distance_km(site["lat"], site["lon"], coordinates[1], coordinates[0]) > radius_km:
            continue
        plume_ids = [value for value in properties.get("plume_ids", []) if value.startswith("tan")]
        if plume_ids:
            clusters += 1
            ids.update(plume_ids)
    return ids, clusters


def get_plumes(plume_ids: set[str]) -> list[dict]:
    if not plume_ids:
        return []
    query = urlencode([("plume_names", plume_id) for plume_id in sorted(plume_ids)] + [("limit", "100")])
    return get_json(f"{PLUMES_URL}?{query}").get("items", [])


def observation(item: dict) -> dict:
    geometry = item.get("geometry_json") or {}
    if isinstance(geometry, str):
        geometry = json.loads(geometry)
    coordinates = geometry.get("coordinates") or [None, None]
    return {
        "plumeId": item["plume_id"],
        "instrument": "Tanager",
        "gas": "CH4",
        "observedAt": item.get("scene_timestamp"),
        "lat": coordinates[1],
        "lon": coordinates[0],
        "emissionKgPerHour": item.get("emission_auto"),
        "emissionUncertaintyKgPerHour": item.get("emission_uncertainty_auto"),
    }


def plumes_for_site(sources: dict, site: dict, radius_km: float) -> dict:
    """Tanager plume records near one site. No records means no public coverage, never "no methane"."""
    plume_ids, source_count = plume_ids_near_site(sources, site, radius_km)
    records = [observation(item) for item in get_plumes(plume_ids)]
    records = [r for r in records if r["lat"] is not None and r["lon"] is not None]
    return {
        "status": "observed" if records else "no_public_coverage",
        "sourceCount": source_count,
        "plumeCount": len(records),
        "observations": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--radius", type=float, default=15)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()

    sites = json.loads(SITES_PATH.read_text(encoding="utf-8"))
    sources = get_json(SOURCES_URL)
    result = {
        "catalogCheckedAt": date.today().isoformat(),
        "coverageRadiusKm": args.radius,
        "source": "Carbon Mapper public catalog",
        "licenseNote": "Verify Carbon Mapper Terms of Use before redistributing catalog imagery or derived records.",
        "sites": {site["id"]: plumes_for_site(sources, site, args.radius) for site in sites},
    }

    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")
    for site_id, record in result["sites"].items():
        print(f"{site_id}: {record['plumeCount']} Tanager plumes, {record['sourceCount']} source clusters")


if __name__ == "__main__":
    main()
