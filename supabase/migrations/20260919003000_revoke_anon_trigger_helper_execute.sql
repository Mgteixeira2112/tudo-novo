-- Auditoria RBAC: funcoes de trigger internas nao sao endpoints publicos.
-- Escopo deliberado: 11 funcoes SECURITY DEFINER ja vinculadas a triggers ativos.
-- Mantem EXECUTE de authenticated e service_role; nao recria funcao/trigger
-- nem altera reservas, KDS, RLS, dados ou a definicao dos triggers.
-- O PostgreSQL verifica EXECUTE na criacao do trigger; triggers existentes
-- permanecem vinculados. O teste funcional real continua obrigatorio.
DO $migration$
DECLARE
  v_name text;
  v_proc oid;
  v_binding_count integer;
  v_expected text[] := ARRAY[
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
  ];
BEGIN
  IF cardinality(v_expected) <> 11 OR (SELECT count(DISTINCT name) FROM unnest(v_expected) name) <> 11 THEN
    RAISE EXCEPTION 'Lista de triggers internos divergente';
  END IF;

  FOREACH v_name IN ARRAY v_expected LOOP
    SELECT p.oid, (
      SELECT count(*) FROM pg_trigger t
      WHERE t.tgfoid=p.oid AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    ) INTO v_proc, v_binding_count
    FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND p.proname=v_name
      AND p.prokind='f' AND p.prorettype='pg_catalog.trigger'::regtype
      AND p.pronargs=0 AND p.prosecdef
      AND pg_get_userbyid(p.proowner)='postgres';

    IF v_proc IS NULL OR coalesce(v_binding_count,0)=0 THEN
      RAISE EXCEPTION 'Trigger SECURITY DEFINER ausente ou sem vinculo ativo: %', v_name;
    END IF;
    IF NOT has_function_privilege('authenticated',v_proc,'EXECUTE')
       OR NOT has_function_privilege('service_role',v_proc,'EXECUTE') THEN
      RAISE EXCEPTION 'Privilegios existentes inesperados para %', v_name;
    END IF;
  END LOOP;

  FOREACH v_name IN ARRAY v_expected LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon',v_name);
  END LOOP;

  FOREACH v_name IN ARRAY v_expected LOOP
    SELECT p.oid INTO v_proc FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND p.proname=v_name
      AND p.prokind='f' AND p.prorettype='pg_catalog.trigger'::regtype
      AND p.pronargs=0 AND p.prosecdef;
    IF v_proc IS NULL OR has_function_privilege('anon',v_proc,'EXECUTE')
       OR NOT has_function_privilege('authenticated',v_proc,'EXECUTE')
       OR NOT has_function_privilege('service_role',v_proc,'EXECUTE')
       OR EXISTS (
          SELECT 1 FROM aclexplode((SELECT p.proacl FROM pg_proc p WHERE p.oid=v_proc)) a
          WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
       ) THEN
      RAISE EXCEPTION 'Postflight ACL falhou para %',v_name;
    END IF;
  END LOOP;
END;
$migration$;
