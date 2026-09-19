-- Auxiliares exclusivos de RBAC / bootstrap: jamais precisam ser RPCs anonimas.
-- Preserva EXECUTE authenticated (policies RLS) e service_role, sem alterar definicoes.
DO $preflight$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.prokind = 'f'
    AND p.prosecdef
    AND (p.proname, pg_get_function_identity_arguments(p.oid)) IN (
      ('current_staff_has_permission', 'p_permission text'),
      ('staff_users_empty', '')
    )
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND has_function_privilege('service_role', p.oid, 'EXECUTE');
  IF v_count <> 2 OR EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace
      AND p.proname IN ('current_staff_has_permission','staff_users_empty')
      AND (p.proname, pg_get_function_identity_arguments(p.oid)) NOT IN (
        ('current_staff_has_permission','p_permission text'),
        ('staff_users_empty','')
      )
  ) THEN
    RAISE EXCEPTION 'Funcoes auxiliares RBAC divergentes; revisar antes de aplicar.';
  END IF;
END;
$preflight$;

REVOKE EXECUTE ON FUNCTION public.current_staff_has_permission(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.staff_users_empty() FROM PUBLIC, anon;

DO $postflight$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM pg_proc p
  WHERE p.pronamespace='public'::regnamespace AND p.prokind='f'
    AND (p.proname, pg_get_function_identity_arguments(p.oid)) IN (
      ('current_staff_has_permission','p_permission text'),
      ('staff_users_empty','')
    )
    AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
    AND has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND has_function_privilege('service_role',p.oid,'EXECUTE')
    AND NOT EXISTS (
      SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    );
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Privilegios de auxiliares RBAC nao protegidos: % de 2.', v_count;
  END IF;
END;
$postflight$;
