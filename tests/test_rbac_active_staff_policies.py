"""Offline scope checks for the RBAC migration; live RLS is audited in SQL."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase/migrations/20260918170000_rbac_guard_authenticated_read_policies.sql'
AUDIT = ROOT / 'supabase/audits/rbac_active_staff_read.sql'
EXPECTED = {
    ('inventory_loss_damage_events', 'loss_damage_authenticated_read'),
    ('laundry_batch_items', 'laundry_batch_items_authenticated_read'),
    ('laundry_batches', 'laundry_batches_authenticated_read'),
    ('linen_movements', 'linen_movements_authenticated_read'),
    ('linen_positions', 'linen_positions_authenticated_read'),
    ('menu_item_demand_forecasts', 'menu_item_demand_forecasts_authenticated_read'),
    ('room_amenity_kit_items', 'room_amenity_kit_items_authenticated_read'),
    ('room_amenity_kits', 'room_amenity_kits_authenticated_read'),
}


class RbacPolicyScopeTests(unittest.TestCase):
    def test_all_and_only_expected_policies_require_active_staff(self):
        sql = MIGRATION.read_text(encoding='utf-8')
        changes = re.findall(r'ALTER POLICY (\w+) ON public\.(\w+)\s+USING \(([^;]+)\);', sql, re.I | re.S)
        self.assertEqual({(table, name) for name, table, _ in changes}, EXPECTED)
        self.assertEqual(len(changes), len(EXPECTED))
        for _, _, expression in changes:
            self.assertIn('EXISTS (SELECT 1 FROM public.staff_users s', expression)
            self.assertIn('s.id = auth.uid()', expression)
            self.assertIn('s.active = true', expression)
        self.assertNotRegex(sql, r'(?i)grant\s+.*\s+to\s+anon')
        self.assertNotRegex(sql, r'(?i)\b(create|drop)\s+policy\b')

    def test_readonly_audit_covers_same_eight_policies(self):
        audit_sql = AUDIT.read_text(encoding='utf-8')
        for table, policy in EXPECTED:
            self.assertIn(f"('{table}','{policy}')", audit_sql)
        self.assertIn('overly_broad_authenticated_reads', audit_sql)
        self.assertNotRegex(audit_sql, r'(?i)\b(alter|update|delete|insert|drop|create)\s+(?:role|policy|table|schema|on|into|from)\b')


if __name__ == '__main__':
    unittest.main()
