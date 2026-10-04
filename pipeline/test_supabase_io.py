import unittest
from unittest import mock

from supabase_io import Supabase


class ClientTests(unittest.TestCase):
    def test_whitespace_in_pasted_secrets_is_ignored(self):
        db = Supabase("https://abc.supabase.co/ \n", " secret-key\n")
        self.assertEqual(db.base, "https://abc.supabase.co/rest/v1")
        self.assertEqual(db.headers["apikey"], "secret-key")
        self.assertEqual(db.headers["Authorization"], "Bearer secret-key")

    def test_trailing_slash_is_ignored(self):
        self.assertEqual(Supabase("https://abc.supabase.co/", "k").base, "https://abc.supabase.co/rest/v1")

    def test_set_status_stamps_rejected_at_only_for_rejections(self):
        db = Supabase("https://abc.supabase.co", "k")
        with mock.patch.object(db, "_request") as req:
            db.set_status("a-site", "rejected", "too little data")
            db.set_status("a-site", "done")
        rejected, done = (call.args[2] for call in req.call_args_list)
        self.assertEqual(rejected["satellite_status"], "rejected")
        self.assertIsNotNone(rejected["rejected_at"])
        self.assertIsNone(done["rejected_at"])


if __name__ == "__main__":
    unittest.main()
