"""Load the sites and results shipped in web/src/data/*.json into Supabase (idempotent).

Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python seed_supabase.py
"""

from __future__ import annotations

import json
from pathlib import Path

from supabase_io import Supabase

DATA = Path(__file__).resolve().parent.parent / "web" / "src" / "data"


def site_row(s: dict) -> dict:
    """sites.json entry (camelCase, the web Site type) to a sites table row."""
    return {
        "id": s["id"],
        "name": s["name"],
        "state": s["state"],
        "lat": s["lat"],
        "lon": s["lon"],
        "acceptance": s["acceptance"],
        "k": s["k"],
        "l0": s["L0"],
        "existing_capture": s["existingCapture"],
        "illustrative": s["illustrative"],
        "reported_emissions": s.get("reportedEmissions"),
        "notes": s["notes"],
        "sources": s["sources"],
        "satellite_status": "done",
        # Backdated so the add-site rate limit only counts sites users add, not the bundled ones.
        "created_at": "2020-01-01T00:00:00Z",
    }


def main() -> None:
    db = Supabase.from_env()
    sites = json.loads((DATA / "sites.json").read_text())
    satellite = json.loads((DATA / "satellite.json").read_text())
    grids = json.loads((DATA / "methaneGrid.json").read_text())
    for s in sites:
        db.upsert("sites", "id", site_row(s))
        if s["id"] in satellite:
            db.upsert("satellite_results", "site_id", {"site_id": s["id"], "data": satellite[s["id"]]})
        if s["id"] in grids:
            db.upsert("methane_grid", "site_id", {"site_id": s["id"], "data": grids[s["id"]]})
        print(f"seeded {s['id']}")


if __name__ == "__main__":
    main()
