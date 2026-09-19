"""Regression guard for the manual, read-only anonymous RPC inventory."""
import re
import unittest
from collections import Counter
from pathlib import Path

SQL = (Path(__file__).resolve().parents[1] / 'supabase/audits/anon_public_rpc_allowlist.sql').read_text(encoding='utf-8')


class AnonPublicRpcAllowlistTests(unittest.TestCase):
    def test_explicit_signatures_and_categories(self):
        entries = re.findall(r"\('([a-z_0-9]+\([^']*\))','([A-Z_]+)'\)", SQL)
        self.assertEqual(len(entries), 18)
        self.assertEqual(len({signature for signature, _ in entries}), 18)
        self.assertEqual(Counter(category for _, category in entries), {
            'PRECHECKIN': 2,
            'BOOKING_WRITE': 3,
            'AVAILABILITY': 2,
            'KDS': 9,
            'PUBLIC_SETTINGS': 2,
        })
        self.assertIn(('complete_reservation_precheckin_public(text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean)', 'PRECHECKIN'), entries)
        self.assertIn(('get_public_site_settings(text)', 'PUBLIC_SETTINGS'), entries)

    def test_read_only_catalog_and_positive_guards(self):
        sql = re.sub(r'^--.*$', '', SQL, flags=re.M).lower()
        self.assertTrue(sql.lstrip().startswith('with expected('))
        # EXECUTE is a legitimate privilege name inside has_function_privilege;
        # prohibit the executable SQL statement instead of its string literal.
        self.assertNotRegex(sql, r'\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|call)\b')
        self.assertNotRegex(sql, r'^\s*execute\b')
        for snippet in (
            'has_function_privilege(\'anon\'',
            'p.prosecdef',
            'actual_signature is null',
            'expected_signature is null',
            'token = p_token',
            'active = true',
            'pre_checkin_token_expires_at > now',
            'malformed_kds_tokens',
            'unexpected_signatures',
            'missing_signatures',
        ):
            self.assertIn(snippet, sql)


if __name__ == '__main__':
    unittest.main()
