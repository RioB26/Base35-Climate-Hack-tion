import unittest

from supabase_io import Supabase


class ClientTests(unittest.TestCase):
    def test_whitespace_in_pasted_secrets_is_ignored(self):
        db = Supabase("https://abc.supabase.co/ \n", " secret-key\n")
        self.assertEqual(db.base, "https://abc.supabase.co/rest/v1")
        self.assertEqual(db.headers["apikey"], "secret-key")
        self.assertEqual(db.headers["Authorization"], "Bearer secret-key")

    def test_trailing_slash_is_ignored(self):
        self.assertEqual(Supabase("https://abc.supabase.co/", "k").base, "https://abc.supabase.co/rest/v1")


if __name__ == "__main__":
    unittest.main()
