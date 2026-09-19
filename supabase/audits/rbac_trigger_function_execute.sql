-- Auditoria manual, somente leitura: 11 triggers internos nao devem expor EXECUTE anon/PUBLIC.
-- Esperado: expected=11, protected=11, missing=0, no_active_trigger=0,
-- authenticated_preserved=11, service_preserved=11, remaining_anon_definers=18.
WITH expected(name) AS (
  SELECT unnest(ARRAY[
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
    'release_room_on_operational_task_completion'
  ]::text[])
), scoped AS (
 SELECT e.name, p.oid, p.proacl,
   coalesce((SELECT count(*) FROM pg_trigger t WHERE t.tgfoid=p.oid
      AND NOT t.tgisinternal AND t.tgenabled <> 'D'),0) AS active_bindings,
   coalesce(has_function_privilege('anon',p.oid,'EXECUTE'),false) anon_execute,
   coalesce(has_function_privilege('authenticated',p.oid,'EXECUTE'),false) authenticated_execute,
   coalesce(has_function_privilege('service_role',p.oid,'EXECUTE'),false) service_execute,
   coalesce((SELECT bool_or(a.grantee=0 AND a.privilege_type='EXECUTE')
       FROM aclexplode(p.proacl) a),false) public_execute
 FROM expected e LEFT JOIN pg_proc p ON p.pronamespace='public'::regnamespace
    AND p.proname=e.name AND p.prokind='f'
    AND p.prorettype='pg_catalog.trigger'::regtype AND p.pronargs=0 AND p.prosecdef
)
SELECT (SELECT count(*) FROM expected) expected,
 count(*) FILTER (WHERE oid IS NOT NULL AND NOT anon_execute AND NOT public_execute) protected,
 count(*) FILTER (WHERE oid IS NULL) missing,
 count(*) FILTER (WHERE active_bindings=0) no_active_trigger,
 count(*) FILTER (WHERE authenticated_execute) authenticated_preserved,
 count(*) FILTER (WHERE service_execute) service_preserved,
 (SELECT count(*) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
    AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE')) remaining_anon_definers
FROM scoped;
