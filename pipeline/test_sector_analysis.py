import math
import random
import unittest

from sector_analysis import Overpass, Pixel, Settings, classify, distance_bearing, mean_grid, overpass_delta, wind_summary

SITE = (-33.8, 150.9)


def ring(u: float, v: float, plume_ppb: float, rng: random.Random, noise: float = 3.0) -> Overpass:
    """Pixels on a ring 20 km from the site, with a plume added on the downwind side."""
    towards = math.degrees(math.atan2(u, v))
    pixels = []
    for bearing in range(0, 360, 5):
        for km in (12, 20, 28):
            d = km / 6371
            b = math.radians(bearing)
            lat0, lon0 = map(math.radians, SITE)
            lat = math.asin(math.sin(lat0) * math.cos(d) + math.cos(lat0) * math.sin(d) * math.cos(b))
            lon = lon0 + math.atan2(math.sin(b) * math.sin(d) * math.cos(lat0), math.cos(d) - math.sin(lat0) * math.sin(lat))
            down = abs((bearing - towards + 180) % 360 - 180) <= 30
            pixels.append(Pixel(math.degrees(lat), math.degrees(lon), 1900 + (plume_ppb if down else 0) + rng.gauss(0, noise)))
    return Overpass("2025-01-01", u, v, pixels)


class SectorTests(unittest.TestCase):
    def test_bearing_east(self):
        dist, bearing = distance_bearing(0, 0, 0, 0.2)
        self.assertAlmostEqual(bearing, 90, places=3)
        self.assertAlmostEqual(dist, 22.24, places=1)

    def test_delta_picks_up_plume(self):
        op = ring(5, 0, plume_ppb=20, rng=random.Random(1), noise=0)
        self.assertAlmostEqual(overpass_delta(*SITE, op, Settings()), 20, places=6)

    def test_calm_wind_is_skipped(self):
        op = ring(0.5, 0.5, plume_ppb=20, rng=random.Random(1))
        self.assertIsNone(overpass_delta(*SITE, op, Settings()))

    def test_elevated(self):
        rng = random.Random(2)
        ops = [ring(rng.uniform(-6, 6) or 3, 4, plume_ppb=8, rng=rng) for _ in range(30)]
        self.assertEqual(classify(*SITE, ops)["status"], "elevated")

    def test_neutral(self):
        rng = random.Random(3)
        ops = [ring(3, rng.uniform(-6, 6) or 3, plume_ppb=0, rng=rng) for _ in range(30)]
        self.assertEqual(classify(*SITE, ops)["status"], "neutral")

    def test_few_overpasses_inconclusive(self):
        rng = random.Random(4)
        ops = [ring(4, 4, plume_ppb=10, rng=rng) for _ in range(3)]
        result = classify(*SITE, ops)
        self.assertEqual(result["status"], "inconclusive")
        self.assertEqual(result["overpassesUsed"], 3)

    def test_mean_grid_averages_cells(self):
        ops = [Overpass("d", 3, 3, [Pixel(-33.81, 150.91, 1900), Pixel(-33.82, 150.92, 1910), Pixel(-33.83, 150.93, 1920)])]
        cells = mean_grid(ops, bin_deg=0.05, min_samples=3)
        self.assertEqual(len(cells), 1)
        self.assertAlmostEqual(cells[0][2], 1910)
        self.assertEqual(mean_grid(ops, min_samples=4), [])

    def test_wind_summary_south_westerly(self):
        # Wind from the south-west blows towards the north-east: u and v both positive.
        ops = [Overpass("d", 3, 3), Overpass("d", 4, 4)]
        w = wind_summary(ops)
        self.assertAlmostEqual(w["fromDeg"], 225, places=3)
        self.assertAlmostEqual(w["meanSpeedMs"], round((math.hypot(3, 3) + math.hypot(4, 4)) / 2, 2))
        self.assertEqual(w["rose"], [0, 0, 0, 0, 0, 2, 0, 0])

    def test_classify_exports_wind_of_usable_passes(self):
        rng = random.Random(5)
        ops = [ring(0, 5, plume_ppb=8, rng=rng) for _ in range(10)] + [ring(0.5, 0.5, plume_ppb=0, rng=rng)]
        w = classify(*SITE, ops)["wind"]
        self.assertAlmostEqual(w["fromDeg"], 180, places=3)
        self.assertEqual(sum(w["rose"]), 10)

    def test_no_data(self):
        self.assertEqual(classify(*SITE, [])["status"], "inconclusive")


if __name__ == "__main__":
    unittest.main()
