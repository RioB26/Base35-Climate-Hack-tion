import unittest
from unittest import mock

import run_site


class FakeDb:
    def __init__(self, site):
        self.site = site
        self.statuses = []
        self.rows = {}

    def get_site(self, site_id):
        return self.site if self.site and self.site["id"] == site_id else None

    def set_status(self, site_id, status, error=None):
        self.statuses.append((status, error))

    def upsert(self, table, key, row):
        self.rows[table] = row


SITE = {"id": "new-landfill", "lat": -33.8, "lon": 150.9}
RESULT = {"status": "neutral", "overpassesUsed": 12}
GRID = {"windowStart": "a", "windowEnd": "b", "cells": []}


class RejectionRuleTests(unittest.TestCase):
    def test_boundary_at_the_minimum_overpasses(self):
        minimum = run_site.Settings().min_overpasses
        self.assertIsNotNone(run_site.rejection_for({"overpassesUsed": minimum - 1}))
        self.assertIsNone(run_site.rejection_for({"overpassesUsed": minimum}))

    def test_singular_and_plural_wording(self):
        self.assertIn("1 usable satellite overpass ", run_site.rejection_for({"overpassesUsed": 1}))
        self.assertIn("2 usable satellite overpasses ", run_site.rejection_for({"overpassesUsed": 2}))

    def test_missing_count_is_treated_as_no_data(self):
        self.assertIn("no usable", run_site.rejection_for({}))

    def test_rejection_exits_zero_path_returns_true_and_keeps_grid_out(self):
        db = FakeDb(SITE)
        with mock.patch.object(run_site, "get_json", return_value={"features": []}), \
             mock.patch.object(run_site, "screen_site", return_value=({"overpassesUsed": 1}, GRID)):
            self.assertTrue(run_site.process(db, lambda: object(), "new-landfill", "a", "b"))
        self.assertEqual([s for s, _ in db.statuses], ["running", "rejected"])
        self.assertNotIn("methane_grid", db.rows)


class ProcessTests(unittest.TestCase):
    def setUp(self):
        # Keep the tests offline: an empty catalog means no plumes near the site.
        patcher = mock.patch.object(run_site, "get_json", return_value={"features": []})
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_success_writes_results_and_marks_done(self):
        db = FakeDb(SITE)
        with mock.patch.object(run_site, "screen_site", return_value=(RESULT, GRID)):
            self.assertTrue(run_site.process(db, lambda: object(), "new-landfill", "a", "b"))
        self.assertEqual([s for s, _ in db.statuses], ["running", "done"])
        self.assertEqual(db.rows["satellite_results"], {"site_id": "new-landfill", "data": RESULT})
        self.assertEqual(db.rows["methane_grid"], {"site_id": "new-landfill", "data": GRID})

    def test_too_few_overpasses_rejects_the_site(self):
        db = FakeDb(SITE)
        sparse = {"status": "inconclusive", "overpassesUsed": 3}
        with mock.patch.object(run_site, "screen_site", return_value=(sparse, GRID)):
            self.assertTrue(run_site.process(db, lambda: object(), "new-landfill", "a", "b"))
        status, reason = db.statuses[-1]
        self.assertEqual(status, "rejected")
        self.assertIn("only found 3", reason)
        self.assertNotIn("satellite_results", db.rows)
        self.assertNotIn("methane_grid", db.rows)

    def test_no_overpasses_rejects_with_coverage_message(self):
        db = FakeDb(SITE)
        with mock.patch.object(run_site, "screen_site", return_value=({"status": "inconclusive", "overpassesUsed": 0}, GRID)):
            run_site.process(db, lambda: object(), "new-landfill", "a", "b")
        self.assertEqual(db.statuses[-1][0], "rejected")
        self.assertIn("no usable", db.statuses[-1][1])

    def test_noisy_signal_with_enough_overpasses_is_kept(self):
        db = FakeDb(SITE)
        noisy = {"status": "inconclusive", "overpassesUsed": 10}
        with mock.patch.object(run_site, "screen_site", return_value=(noisy, GRID)):
            run_site.process(db, lambda: object(), "new-landfill", "a", "b")
        self.assertEqual(db.statuses[-1], ("done", None))

    def test_failure_is_recorded_not_raised(self):
        db = FakeDb(SITE)
        with mock.patch.object(run_site, "screen_site", side_effect=RuntimeError("EE quota")):
            self.assertFalse(run_site.process(db, lambda: object(), "new-landfill", "a", "b"))
        self.assertEqual(db.statuses[-1], ("failed", "RuntimeError: EE quota"))
        self.assertEqual(set(db.rows), {"tanager_results"})  # plumes do not depend on Earth Engine

    def test_earth_engine_auth_failure_is_recorded(self):
        db = FakeDb(SITE)

        def bad_init():
            raise RuntimeError("no credentials")

        self.assertFalse(run_site.process(db, bad_init, "new-landfill", "a", "b"))
        self.assertEqual(db.statuses[-1], ("failed", "RuntimeError: no credentials"))

    def test_plumes_are_written(self):
        db = FakeDb(SITE)
        plumes = {"status": "observed", "sourceCount": 1, "plumeCount": 1, "observations": []}
        with mock.patch.object(run_site, "screen_site", return_value=(RESULT, GRID)), \
             mock.patch.object(run_site, "get_json", return_value={}), \
             mock.patch.object(run_site, "plumes_for_site", return_value=plumes):
            self.assertTrue(run_site.process(db, lambda: object(), "new-landfill", "a", "b"))
        written = db.rows["tanager_results"]
        self.assertEqual(written["site_id"], "new-landfill")
        self.assertEqual(written["data"]["status"], "observed")
        self.assertEqual(written["data"]["coverageRadiusKm"], run_site.TANAGER_RADIUS_KM)

    def test_plume_failure_does_not_fail_the_site(self):
        db = FakeDb(SITE)
        with mock.patch.object(run_site, "screen_site", return_value=(RESULT, GRID)), \
             mock.patch.object(run_site, "get_json", side_effect=OSError("catalog down")):
            self.assertTrue(run_site.process(db, lambda: object(), "new-landfill", "a", "b"))
        self.assertEqual(db.statuses[-1], ("done", None))
        self.assertNotIn("tanager_results", db.rows)

    def test_unknown_site_exits(self):
        with self.assertRaises(SystemExit):
            run_site.process(FakeDb(None), lambda: object(), "nope", "a", "b")


if __name__ == "__main__":
    unittest.main()
