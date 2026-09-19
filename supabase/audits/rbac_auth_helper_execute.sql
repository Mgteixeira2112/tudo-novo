-- Auditoria manual, somente SELECT; esperado 2/2 protegidas, anon/PUBLIC 0, autenticados/service 2.
WITH expected(name,arguments) AS (
  VALUES ('current_staff_has_permission','p_permission text'),('staff_users_empty','')
), inspected AS (
  SELECT e.name,p.oid,p.proacl,p.proowner
  FROM expected e LEFT JOIN pg_proc p ON p.pronamespace='public'::regnamespace
    AND p.proname=e.name AND pg_get_function_identity_arguments(p.oid)=e.arguments
    AND p.prokind='f'
)
SELECT (SELECT count(*) FROM expected) expected,
  count(*) FILTER (WHERE oid IS NOT NULL AND NOT has_function_privilege('anon',oid,'EXECUTE')) anon_blocked,
  count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('authenticated',oid,'EXECUTE')) authenticated_allowed,
  count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('service_role',oid,'EXECUTE')) service_allowed,
  count(*) FILTER (WHERE oid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM aclexplode(coalesce(proacl,acldefault('f',proowner))) acl
    WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
  )) public_blocked,
  count(*) FILTER (WHERE oid IS NULL) missing,
  (SELECT count(*) FROM pg_proc p JOIN expected e ON p.proname=e.name
    WHERE p.pronamespace='public'::regnamespace
      AND pg_get_function_identity_arguments(p.oid)<>e.arguments) unexpected_overloads
FROM inspected;
