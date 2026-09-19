"""Offline structural regressions for public precheckin's SECURITY DEFINER RPC.

These tests do not impersonate a browser session; real HTTP and UI checks are separate.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / 'supabase/migrations/20260919015000_precheckin_guest_scope_no_master_overwrite.sql').read_text(encoding='utf-8')
BODY = SQL.split('AS $function$', 1)[1].split('$function$;', 1)[0]
BODY = re.sub(r'--[^\n]*', '', BODY, flags=re.M).lower()


class PublicPrecheckinGuestScopeTests(unittest.TestCase):
    def test_immutable_master_and_no_global_identity_search(self):
        self.assertNotRegex(BODY, r'\bupdate\s+public\.guests\b')
        self.assertNotRegex(BODY, r'\bupdate\s+guests\b')
        self.assertNotIn('order by created_at asc', BODY)
        self.assertEqual(len(re.findall(r'\bfrom\s+public\.guests\b', BODY)), 1)
        self.assertRegex(BODY, r'from\s+public\.guests\s+where\s+id\s*=\s*v_res\.guest_id')
        self.assertRegex(BODY, r'if\s+v_guest_id\s+is\s+null\s+then\s+v_guest_id\s*:=.*?insert\s+into\s+public\.guests', re.S)

    def test_linked_identity_requires_document_and_name(self):
        self.assertIn('if v_res.guest_id is not null', BODY)
        self.assertIn('v_guest.document is not null', BODY)
        self.assertIn('trim(v_guest.document)=v_document', BODY)
        self.assertIn('lower(trim(v_guest.full_name))=lower(v_name)', BODY)

    def test_valid_token_reservation_lock_and_existing_contract(self):
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

    def test_preserves_public_signature_and_grants_without_widening(self):
        self.assertIn('create or replace function public.complete_reservation_precheckin_public(', SQL.lower())
        self.assertIn('security definer', SQL.lower())
        self.assertIn('set search_path = public, extensions', SQL.lower())
        self.assertNotRegex(SQL.lower(), r'(?m)^\s*(?:grant|revoke)\b')
        self.assertIn("has_function_privilege('anon'", SQL.lower())
        self.assertIn("has_function_privilege('authenticated'", SQL.lower())
        self.assertIn('precheckin_scoped_guest_v1', SQL.lower())


if __name__ == '__main__':
    unittest.main()
