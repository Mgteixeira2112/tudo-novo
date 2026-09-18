-- Auditoria RBAC: RPCs internas ja verificam auth.uid() e staff_users ativo,
-- mas ainda concedem EXECUTE explicito a anon. Negar na camada de privilegios.
-- Escopo: cinco funcoes; nao modificar corpo, GRANT authenticated/service_role,
-- reserva publica, KDS por token, trigger, dados ou politicas RLS.
-- Idempotente para reaplicacao de migrations via CLI.
DO $preflight$
DECLARE
  v_found integer;
  v_bad text;
  v_anon integer;
BEGIN
  WITH expected(name, args) AS (
    VALUES
      ('authorize_overdue_stay_exception_atomic', 'p_reservation_id text, p_until_time time without time zone, p_reason text'),
      ('extend_overdue_stay_atomic', 'p_reservation_id text, p_new_check_out_date date, p_reason text'),
      ('extend_overdue_stay_with_transfer_atomic', 'p_reservation_id text, p_new_check_out_date date, p_new_room_id text, p_reason text'),
      ('find_overdue_stay_transfer_rooms', 'p_reservation_id text, p_new_check_out_date date'),
      ('process_checkout_atomic', 'p_reservation_id text, p_payment_method text, p_amount_paid numeric, p_discount numeric, p_inspector_name text, p_notes text')
  ), functions AS (
    SELECT e.name, p.oid, p.prosecdef, pg_get_functiondef(p.oid) AS definition
    FROM expected e LEFT JOIN pg_proc p
      ON p.pronamespace = 'public'::regnamespace AND p.proname = e.name
      AND pg_get_function_identity_arguments(p.oid) = e.args AND p.prokind = 'f'
  )
  SELECT count(oid),
         string_agg(name, ', ') FILTER (
           WHERE oid IS NULL OR NOT coalesce(prosecdef, false)
              OR definition NOT LIKE '%auth.uid()%'
              OR definition NOT LIKE '%staff_users%'
              OR NOT coalesce(has_function_privilege('authenticated', oid, 'EXECUTE'), false)
              OR NOT coalesce(has_function_privilege('service_role', oid, 'EXECUTE'), false)
         ),
         count(*) FILTER (WHERE coalesce(has_function_privilege('anon', oid, 'EXECUTE'), false))
  INTO v_found, v_bad, v_anon
  FROM functions;

  IF v_found <> 5 OR v_bad IS NOT NULL OR v_anon NOT IN (0,5) THEN
    RAISE EXCEPTION 'Escopo/privilegios RPC divergentes: encontradas=%, divergentes=%, anon=%; revisar antes de migrar.', v_found, v_bad, v_anon;
  END IF;
END;
$preflight$;

REVOKE EXECUTE ON FUNCTION public.authorize_overdue_stay_exception_atomic(text, time without time zone, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.extend_overdue_stay_atomic(text, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.extend_overdue_stay_with_transfer_atomic(text, date, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_overdue_stay_transfer_rooms(text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_checkout_atomic(text, text, numeric, numeric, text, text) FROM anon;

DO $postflight$
DECLARE
  v_restricted integer;
BEGIN
  WITH names(name) AS (
    VALUES ('authorize_overdue_stay_exception_atomic'),
           ('extend_overdue_stay_atomic'),
           ('extend_overdue_stay_with_transfer_atomic'),
           ('find_overdue_stay_transfer_rooms'),
           ('process_checkout_atomic')
  )
  SELECT count(*) INTO v_restricted
  FROM names JOIN pg_proc p ON p.pronamespace='public'::regnamespace
    AND p.proname=names.name AND p.prokind='f'
  WHERE NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND has_function_privilege('service_role', p.oid, 'EXECUTE');

  IF v_restricted <> 5 THEN
    RAISE EXCEPTION 'Privilegios RPC inesperados: % de 5 protegidas.', v_restricted;
  END IF;
END;
$postflight$;
