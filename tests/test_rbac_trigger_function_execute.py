"""Offline guard against broad, unsafe RBAC privilege changes."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase/migrations/20260919003000_revoke_anon_trigger_helper_execute.sql'
AUDIT = ROOT / 'supabase/audits/rbac_trigger_function_execute.sql'
EXPECTED = {
    'claim_available_room_for_governance_task',
    'claim_available_room_for_maintenance_task',
    'close_stale_governance_tasks_on_checkout',
    'ensure_room_operational_task',
    'guard_room_operational_transition',
    'move_claimed_governance_room_to_cleaning',
    'move_claimed_maintenance_room_to_maintenance',
    'normalize_checkout_cleaning_task',
    'notify_kitchen_order_created',
    'protect_room_operational_task',
    'release_room_on_operational_task_completion',
}


def expected_array(text):
    match = re.search(r'ARRAY\[(.*?)\]', text, re.S)
    assert match is not None, 'Expected explicit, reviewable function whitelist'
    return re.findall(r"'([a-z_]+)'", match.group(1))


class TriggerExecuteScopeTests(unittest.TestCase):
    def test_explicit_whitelist_matches_audit(self):
        migration = MIGRATION.read_text(encoding='utf-8')
        audit = AUDIT.read_text(encoding='utf-8')
        names = expected_array(migration)
        self.assertEqual(set(names), EXPECTED)
        self.assertEqual(len(names), 11)
        self.assertEqual(set(expected_array(audit)), EXPECTED)

    def test_revocation_only_and_preflight(self):
        sql = MIGRATION.read_text(encoding='utf-8').lower()
        self.assertIn("'pg_catalog.trigger'::regtype", sql)
        self.assertIn('not t.tgisinternal', sql)
        self.assertIn("t.tgenabled <> 'd'", sql)
        self.assertIn('p.prosecdef', sql)
        self.assertIn("pg_get_userbyid(p.proowner)='postgres'", sql)
        self.assertIn("has_function_privilege('authenticated'", sql)
        self.assertIn("has_function_privilege('service_role'", sql)
        self.assertIn("format('revoke execute on function public.%i() from public, anon'", sql)
        self.assertEqual(sql.count('execute format('), 1)
        self.assertNotRegex(sql, r'\b(drop|alter\s+function|create\s+(or\s+replace\s+)?function|update|insert|delete|grant\s+execute)\b')
        self.assertNotIn('from authenticated', sql)
        self.assertNotIn('from service_role', sql)


if __name__ == '__main__':
    unittest.main()
