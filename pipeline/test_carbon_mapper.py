import unittest
from unittest import mock

import carbon_mapper

SITE = {"id": "s", "lat": -34.0, "lon": 151.0}


def feature(lat, lon, ids, gas="CH4"):
    return {"geometry": {"coordinates": [lon, lat]}, "properties": {"gas": gas, "plume_ids": ids}}


class PlumeIdTests(unittest.TestCase):
    def test_radius_gas_and_instrument_filters(self):
        sources = {"features": [
            feature(-34.01, 151.0, ["tan1-A", "emi2-B"]),
            feature(-34.0, 151.0, ["tan3-A"], gas="CO2"),
            feature(-35.5, 151.0, ["tan4-A"]),
        ]}
        ids, clusters = carbon_mapper.plume_ids_near_site(sources, SITE, 15)
        self.assertEqual(ids, {"tan1-A"})
        self.assertEqual(clusters, 1)


class PlumesForSiteTests(unittest.TestCase):
    def test_no_records_means_no_public_coverage(self):
        out = carbon_mapper.plumes_for_site({"features": []}, SITE, 15)
        self.assertEqual(out, {"status": "no_public_coverage", "sourceCount": 0, "plumeCount": 0, "observations": []})

    def test_observed(self):
        sources = {"features": [feature(-34.0, 151.0, ["tan1-A"])]}
        item = {"plume_id": "tan1-A", "scene_timestamp": "2026-01-01T00:00:00Z", "geometry_json": {"coordinates": [151.0, -34.0]}, "emission_auto": 100.0}
        with mock.patch.object(carbon_mapper, "get_plumes", return_value=[item]):
            out = carbon_mapper.plumes_for_site(sources, SITE, 15)
        self.assertEqual((out["status"], out["plumeCount"], out["sourceCount"]), ("observed", 1, 1))
        self.assertEqual(out["observations"][0]["emissionKgPerHour"], 100.0)


if __name__ == "__main__":
    unittest.main()
