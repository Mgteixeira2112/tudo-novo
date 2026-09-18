-- Auditoria manual de privilegios de cinco RPCs internas.
-- Esperado: expected=5, anon_blocked=5, authenticated_allowed=5,
-- service_allowed=5, missing=0, unexpected_overloads=0.
WITH expected(name,args) AS (
  VALUES
    ('authorize_overdue_stay_exception_atomic','p_reservation_id text, p_until_time time without time zone, p_reason text'),
    ('extend_overdue_stay_atomic','p_reservation_id text, p_new_check_out_date date, p_reason text'),
    ('extend_overdue_stay_with_transfer_atomic','p_reservation_id text, p_new_check_out_date date, p_new_room_id text, p_reason text'),
    ('find_overdue_stay_transfer_rooms','p_reservation_id text, p_new_check_out_date date'),
    ('process_checkout_atomic','p_reservation_id text, p_payment_method text, p_amount_paid numeric, p_discount numeric, p_inspector_name text, p_notes text')
), functions AS (
  SELECT e.name, p.oid
  FROM expected e LEFT JOIN pg_proc p
    ON p.pronamespace='public'::regnamespace AND p.proname=e.name
    AND pg_get_function_identity_arguments(p.oid)=e.args AND p.prokind='f'
)
SELECT (SELECT count(*) FROM expected) AS expected,
       count(*) FILTER (WHERE oid IS NOT NULL AND NOT has_function_privilege('anon',oid,'EXECUTE')) AS anon_blocked,
       count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('authenticated',oid,'EXECUTE')) AS authenticated_allowed,
       count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('service_role',oid,'EXECUTE')) AS service_allowed,
       count(*) FILTER (WHERE oid IS NULL) AS missing,
       (SELECT count(*) FROM pg_proc p JOIN expected e ON p.proname=e.name
         WHERE p.pronamespace='public'::regnamespace AND p.prokind='f'
           AND pg_get_function_identity_arguments(p.oid)<>e.args) AS unexpected_overloads
FROM functions;
