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
        self.assertEqual(db.rows, {})

    def test_earth_engine_auth_failure_is_recorded(self):
        db = FakeDb(SITE)

        def bad_init():
            raise RuntimeError("no credentials")

        self.assertFalse(run_site.process(db, bad_init, "new-landfill", "a", "b"))
        self.assertEqual(db.statuses[-1], ("failed", "RuntimeError: no credentials"))

    def test_unknown_site_exits(self):
        with self.assertRaises(SystemExit):
            run_site.process(FakeDb(None), lambda: object(), "nope", "a", "b")


if __name__ == "__main__":
    unittest.main()
