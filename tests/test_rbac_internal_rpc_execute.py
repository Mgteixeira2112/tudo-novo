"""Offline scope tests. Live catalog privilege checks live in supabase/audits/."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase/migrations/20260918190000_restrict_internal_rpc_anon_execute.sql'
AUDIT = ROOT / 'supabase/audits/rbac_internal_rpc_execute.sql'
EXPECTED = {
    'authorize_overdue_stay_exception_atomic',
    'extend_overdue_stay_atomic',
    'extend_overdue_stay_with_transfer_atomic',
    'find_overdue_stay_transfer_rooms',
    'process_checkout_atomic',
}


class InternalRpcExecutionTests(unittest.TestCase):
    def test_only_expected_internal_rpcs_revoke_anon(self):
        sql = MIGRATION.read_text(encoding='utf-8')
        names = re.findall(r'REVOKE EXECUTE ON FUNCTION public\.(\w+)\([^;]*\) FROM anon;', sql)
        self.assertEqual(set(names), EXPECTED)
        self.assertEqual(len(names), 5)
        self.assertNotRegex(sql, r'(?i)\bGRANT\s+(?:EXECUTE|ALL)\b')
        self.assertNotRegex(sql, r'(?i)\bREVOKE\s+EXECUTE\b[^;]*\bFROM\s+(?:authenticated|service_role|public)\b')
        self.assertNotRegex(sql, r'(?i)\b(?:ALTER|CREATE|DROP)\s+(?:POLICY|TABLE|ROLE|FUNCTION)\b')
        self.assertIn('v_anon NOT IN (0,5)', sql)
        self.assertIn('v_restricted <> 5', sql)

    def test_read_only_audit_covers_same_five_rpcs(self):
        sql = AUDIT.read_text(encoding='utf-8')
        names = re.findall(r"\('([a-z_]+)',\s*'p_", sql)
        self.assertEqual(set(names), EXPECTED)
        self.assertEqual(len(names), 5)
        self.assertIn('anon_blocked', sql)
        self.assertIn('authenticated_allowed', sql)
        self.assertIn('service_allowed', sql)
        self.assertIn('unexpected_overloads', sql)
        self.assertNotRegex(sql, r'(?i)\b(?:REVOKE|GRANT|ALTER|UPDATE|DELETE|INSERT|DROP|CREATE)\s+(?:ON|INTO|FROM|FUNCTION|ROLE|POLICY|TABLE)\b')


if __name__ == '__main__':
    unittest.main()
