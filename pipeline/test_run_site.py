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
