"""Scope regression for notification RLS; real login tests remain separate."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase/migrations/20260919041000_guard_notifications_active_staff.sql'
AUDIT = ROOT / 'supabase/audits/rbac_notifications_active_staff.sql'
EXPECTED = {
    ('notification_recipients', 'notification_recipients_select_own'): (True, False),
    ('notification_recipients', 'notification_recipients_update_own'): (True, True),
    ('operational_notifications', 'operational_notifications_select_recipient'): (True, False),
    ('user_notification_preferences', 'user_notification_preferences_insert_own'): (False, True),
    ('user_notification_preferences', 'user_notification_preferences_select_own'): (True, False),
    ('user_notification_preferences', 'user_notification_preferences_update_own'): (True, True),
}


class NotificationRevocationTests(unittest.TestCase):
    def test_only_six_expected_policies_change(self):
        sql = MIGRATION.read_text(encoding='utf-8')
        changes = re.findall(r'ALTER POLICY\s+(\w+)\s+ON\s+public\.(\w+)\s+(.+?);', sql, re.I | re.S)
        self.assertEqual(len(changes), 6)
        self.assertEqual({(table, name) for name, table, _ in changes}, set(EXPECTED))
        self.assertNotRegex(sql, r'(?im)^\s*(?:create|drop|grant|revoke|insert|update|delete)\s+')
        for name, table, body in changes:
            needs_using, needs_check = EXPECTED[table, name]
            self.assertEqual('USING (' in body.upper(), needs_using)
            self.assertEqual('WITH CHECK (' in body.upper(), needs_check)
            self.assertIn('s.id = auth.uid()', body)
            self.assertIn('s.active = true', body)
            if needs_using:
                self.assertIn('auth.uid()', body.split('WITH CHECK')[0])
            if needs_check:
                self.assertIn('user_id = auth.uid()', body.split('WITH CHECK')[1])
            if table == 'operational_notifications':
                self.assertIn('nr.notification_id = operational_notifications.id', body)
                self.assertIn('nr.user_id = auth.uid()', body)
            else:
                self.assertIn('user_id = auth.uid()', body)

    def test_manual_audit_checks_all_six_and_never_writes(self):
        sql = AUDIT.read_text(encoding='utf-8')
        for table, name in EXPECTED:
            self.assertIn(f"('{table}','{name}'", sql)
        for field in ('expected_policies', 'present_policies', 'protected_policies',
                      'missing_policies', 'unguarded_policies', 'stale_recipients_in_database'):
            self.assertIn(field, sql)
        self.assertNotRegex(sql, r'(?im)^\s*(?:create|alter|drop|insert|update|delete|grant|revoke)\s+')


if __name__ == '__main__':
    unittest.main()
