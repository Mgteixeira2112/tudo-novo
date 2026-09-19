"""Offline regression of the two RBAC helper grants; live privileges require SQL audit."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase/migrations/20260918213000_revoke_anon_auth_helper_execute.sql'
AUDIT = ROOT / 'supabase/audits/rbac_auth_helper_execute.sql'
EXPECTED = {
    'current_staff_has_permission(text)',
    'staff_users_empty()',
}


class AuthHelperPrivilegeTests(unittest.TestCase):
    def test_only_two_helper_revocations(self):
        sql = MIGRATION.read_text(encoding='utf-8')
        revocations = re.findall(
            r'REVOKE EXECUTE ON FUNCTION public\.(\w+\([^;]*?\)) FROM PUBLIC, anon;',
            sql,
            flags=re.I,
        )
        self.assertEqual(set(revocations), EXPECTED)
        self.assertEqual(len(revocations), len(EXPECTED))
        self.assertIn("has_function_privilege('authenticated'", sql)
        self.assertIn("has_function_privilege('service_role'", sql)
        self.assertIn("NOT has_function_privilege('anon'", sql)
        self.assertNotRegex(sql, r'(?i)\b(?:drop|create|alter)\s+(?:table|policy|role|function)\b')

    def test_readonly_audit_has_all_assertions(self):
        sql = AUDIT.read_text(encoding='utf-8')
        for name in ('current_staff_has_permission', 'staff_users_empty'):
            self.assertIn(name, sql)
        for name in ('anon_blocked', 'authenticated_allowed', 'service_allowed',
                     'public_blocked', 'missing', 'unexpected_overloads'):
            self.assertIn(name, sql)
        self.assertNotRegex(sql, r'(?i)\b(?:revoke|grant|drop|create|alter|update|delete|insert)\s+')


if __name__ == '__main__':
    unittest.main()
