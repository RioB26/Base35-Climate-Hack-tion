"""Downwind-minus-upwind screening statistic for Sentinel-5P methane.

Pure Python (no numpy) so it can be tested without Earth Engine. Input is a list
of overpasses; each overpass has a wind vector at the site and the XCH4 pixels
around it. Output is a screening classification, never an emission rate.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

EARTH_RADIUS_KM = 6371.0


@dataclass
class Pixel:
    lat: float
    lon: float
    xch4_ppb: float


@dataclass
class Overpass:
    date: str
    u_ms: float  # eastward wind
    v_ms: float  # northward wind
    pixels: list[Pixel] = field(default_factory=list)


@dataclass
class Settings:
    inner_km: float = 10.0
    outer_km: float = 30.0
    half_angle_deg: float = 30.0
    min_pixels_per_sector: int = 5
    min_wind_ms: float = 2.0
    min_overpasses: int = 8
    neutral_half_width_ppb: float = 10.0
    bootstrap_samples: int = 1000
    seed: int = 35


def distance_bearing(lat0: float, lon0: float, lat1: float, lon1: float) -> tuple[float, float]:
    """Great-circle distance (km) and initial bearing (degrees from north) from point 0 to point 1."""
    p0, p1 = math.radians(lat0), math.radians(lat1)
    dl = math.radians(lon1 - lon0)
    a = math.sin((p1 - p0) / 2) ** 2 + math.cos(p0) * math.cos(p1) * math.sin(dl / 2) ** 2
    dist = 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))
    y = math.sin(dl) * math.cos(p1)
    x = math.cos(p0) * math.sin(p1) - math.sin(p0) * math.cos(p1) * math.cos(dl)
    return dist, (math.degrees(math.atan2(y, x)) + 360) % 360


def angle_diff(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def overpass_delta(site_lat: float, site_lon: float, op: Overpass, s: Settings) -> float | None:
    """Mean XCH4 downwind minus mean XCH4 upwind for one overpass, or None if unusable."""
    speed = math.hypot(op.u_ms, op.v_ms)
    if speed < s.min_wind_ms:
        return None
    # Direction the wind blows towards, in degrees from north.
    towards = (math.degrees(math.atan2(op.u_ms, op.v_ms)) + 360) % 360
    down, up = [], []
    for px in op.pixels:
        dist, bearing = distance_bearing(site_lat, site_lon, px.lat, px.lon)
        if not (s.inner_km <= dist <= s.outer_km):
            continue
        if angle_diff(bearing, towards) <= s.half_angle_deg:
            down.append(px.xch4_ppb)
        elif angle_diff(bearing, towards + 180) <= s.half_angle_deg:
            up.append(px.xch4_ppb)
    if len(down) < s.min_pixels_per_sector or len(up) < s.min_pixels_per_sector:
        return None
    return sum(down) / len(down) - sum(up) / len(up)


def bootstrap_ci(values: list[float], samples: int, seed: int) -> tuple[float, float]:
    rng = random.Random(seed)
    n = len(values)
    means = sorted(sum(rng.choices(values, k=n)) / n for _ in range(samples))
    return means[int(0.025 * samples)], means[int(0.975 * samples) - 1]


def wind_summary(overpasses: list[Overpass]) -> dict | None:
    """Mean speed, prevailing direction and an 8-sector rose for the map's wind arrow.

    `fromDeg` is where the wind comes from (meteorological convention), from the
    vector mean of unit wind directions. `rose` counts passes by the direction the
    wind came from: N, NE, E, SE, S, SW, W, NW.
    """
    if not overpasses:
        return None
    speeds = [math.hypot(op.u_ms, op.v_ms) for op in overpasses]
    sx = sum(op.u_ms / sp for op, sp in zip(overpasses, speeds) if sp > 0)
    sy = sum(op.v_ms / sp for op, sp in zip(overpasses, speeds) if sp > 0)
    towards = math.degrees(math.atan2(sx, sy))
    rose = [0] * 8
    for op in overpasses:
        frm = (math.degrees(math.atan2(-op.u_ms, -op.v_ms)) + 360) % 360
        rose[int(((frm + 22.5) % 360) // 45)] += 1
    return {
        "meanSpeedMs": round(sum(speeds) / len(speeds), 2),
        "fromDeg": round((towards + 180) % 360, 1),
        "rose": rose,
    }


def classify(site_lat: float, site_lon: float, overpasses: list[Overpass], s: Settings | None = None) -> dict:
    """Aggregate overpasses into the satellite.json record for one site."""
    s = s or Settings()
    usable = [(op, d) for op in overpasses if (d := overpass_delta(site_lat, site_lon, op, s)) is not None]
    deltas = [d for _, d in usable]
    dates = sorted(op.date for op in overpasses)
    record = {
        "overpassesUsed": len(deltas),
        "windowStart": dates[0] if dates else None,
        "windowEnd": dates[-1] if dates else None,
        "deltaPpb": None,
        "ci95Ppb": None,
        "confidence": "low",
    }
    wind = wind_summary([op for op, _ in usable])
    if wind:
        record["wind"] = wind
    if len(deltas) < 2:
        return {**record, "status": "inconclusive", "note": "Too few usable overpasses for a signal."}

    mean = sum(deltas) / len(deltas)
    lo, hi = bootstrap_ci(deltas, s.bootstrap_samples, s.seed)
    record.update(deltaPpb=round(mean, 2), ci95Ppb=[round(lo, 2), round(hi, 2)])

    if len(deltas) < s.min_overpasses:
        status, note = "inconclusive", f"Only {len(deltas)} usable overpasses (minimum {s.min_overpasses})."
    elif lo > 0:
        status, note = "elevated", "Downwind methane is consistently above upwind."
    elif lo <= 0 <= hi and (hi - lo) / 2 < s.neutral_half_width_ppb:
        status, note = "neutral", "No consistent downwind enhancement."
    else:
        status, note = "inconclusive", "Signal too noisy to separate from zero."

    confidence = "high" if len(deltas) >= 3 * s.min_overpasses else "medium" if len(deltas) >= s.min_overpasses else "low"
    return {**record, "status": status, "confidence": confidence, "note": note}


def classify_periods(site_lat: float, site_lon: float, overpasses: list[Overpass], s: Settings | None = None) -> list[dict]:
    """Classify calendar-month windows from the same timestamped overpasses."""
    by_month: dict[str, list[Overpass]] = {}
    for op in overpasses:
        by_month.setdefault(op.date[:7], []).append(op)
    periods = []
    for month in sorted(by_month):
        record = classify(site_lat, site_lon, by_month[month], s)
        periods.append({"period": month, **record})
    return periods


def mean_grid(overpasses: list[Overpass], bin_deg: float = 0.05, min_samples: int = 3) -> list[list[float]]:
    """Average XCH4 per grid cell across all overpasses, for the map layer.

    Returns [lat, lon, ppb] per cell centre. Cells with fewer than `min_samples`
    pixels are dropped. This is a picture of the area, not an emission estimate.
    """
    sums: dict[tuple[int, int], list[float]] = {}
    for op in overpasses:
        for px in op.pixels:
            key = (math.floor(px.lat / bin_deg), math.floor(px.lon / bin_deg))
            acc = sums.setdefault(key, [0.0, 0])
            acc[0] += px.xch4_ppb
            acc[1] += 1
    return [
        [round((i + 0.5) * bin_deg, 4), round((j + 0.5) * bin_deg, 4), round(total / n, 2)]
        for (i, j), (total, n) in sorted(sums.items())
        if n >= min_samples
    ]
