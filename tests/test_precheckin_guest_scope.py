"""Structural tests only; browser/API authorization still needs functional validation."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / 'supabase/migrations/20260919015000_precheckin_guest_scope_no_master_overwrite.sql').read_text(encoding='utf-8')
BODY = SQL.split('AS $function$', 1)[1].split('$function$;', 1)[0]
BODY = re.sub(r'--[^\n]*', '', BODY, flags=re.M).lower()


class PublicPrecheckinGuestScopeTests(unittest.TestCase):
    def test_existing_master_is_read_only_and_not_searched_globally(self):
        self.assertNotRegex(BODY, r'\bupdate\s+(?:public\.)?guests\b')
        self.assertNotIn('order by created_at asc', BODY)
        self.assertEqual(len(re.findall(r'\bfrom\s+public\.guests\b', BODY)), 1)
        self.assertRegex(BODY, r'from\s+public\.guests\s+where\s+id\s*=\s*v_res\.guest_id')
        self.assertRegex(BODY, r'if\s+v_guest_id\s+is\s+null\s+then\s+v_guest_id\s*:=[\s\S]*?insert\s+into\s+public\.guests')

    def test_linked_identity_requires_document_and_name(self):
        self.assertIn('if v_res.guest_id is not null', BODY)
        self.assertIn('v_guest.document is not null', BODY)
        self.assertIn('trim(v_guest.document)=v_document', BODY)
        self.assertIn('lower(trim(v_guest.full_name))=lower(v_name)', BODY)

    def test_token_lock_and_existing_contract_remain(self):
        for snippet in (
            "pre_checkin_token_hash=encode(digest(p_token,'sha256'),'hex')",
            'pre_checkin_token_expires_at>now()',
            "status='confirmada'",
            'for update;',
            "v_res.pre_checkin_status='concluido'",
            "if not coalesce(p_declaration_accepted,false)",
            'where id=v_res.id;',
            "terms_version='precheckin-declaration-v1'",
            "'guest_id',v_guest_id",
        ):
            self.assertIn(snippet, BODY)

    def test_same_signature_and_grants_no_widening(self):
        sql = SQL.lower()
        self.assertIn('create or replace function public.complete_reservation_precheckin_public(', sql)
        self.assertIn('security definer', sql)
        self.assertIn('set search_path = public, extensions', sql)
        self.assertNotRegex(sql, r'(?m)^\s*(?:grant|revoke)\b')
        self.assertIn("has_function_privilege('anon'", sql)
        self.assertIn("has_function_privilege('authenticated'", sql)
        self.assertIn('precheckin_scoped_guest_v1', sql)


if __name__ == '__main__':
    unittest.main()
