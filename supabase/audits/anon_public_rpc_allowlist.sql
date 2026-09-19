-- Auditoria manual somente leitura do catalogo live das RPCs SECURITY DEFINER
-- acessiveis ao papel anon. Uma assinatura permitida nesta lista NAO equivale
-- a homologacao de seguranca da implementacao ou a um teste HTTP funcional.
-- Esperado no baseline 19/09/2026: 18/18 assinaturas; sem exposicoes novas,
-- ausencias, mudanca de assinatura, perda de grant, nem token gates ausentes.
WITH expected(signature,category) AS (
 VALUES
 ('complete_reservation_precheckin_public(text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean)','PRECHECKIN'),
 ('create_reservation_atomic(text,text,text,text,date,date,integer,integer,text,text)','BOOKING_WRITE'),
 ('create_reservation_atomic_v2(text,text,text,text,text,date,date,integer,integer,text,text)','BOOKING_WRITE'),
 ('create_reservation_group_atomic(text,text,text,date,date,integer,integer,text,jsonb,text)','BOOKING_WRITE'),
 ('get_available_room_types(date,date,integer,integer)','AVAILABILITY'),
 ('get_available_room_types_v2(date,date)','AVAILABILITY'),
 ('get_kds_frontdesk_overview(text)','KDS'),
 ('get_kds_housekeeping_rooms(text)','KDS'),
 ('get_kds_kitchen_orders(text)','KDS'),
 ('get_kds_maintenance_rooms(text)','KDS'),
 ('get_kds_operational_alerts(text)','KDS'),
 ('get_kds_operations_overview(text)','KDS'),
 ('get_kds_public(text)','KDS'),
 ('get_public_hotel_settings()','PUBLIC_SETTINGS'),
 ('get_public_site_settings(text)','PUBLIC_SETTINGS'),
 ('get_reservation_precheckin_public(text)','PRECHECKIN'),
 ('heartbeat_kds_display(text)','KDS'),
 ('validate_kds_display_token(text)','KDS')
), actual AS (
 SELECT p.oid,
        format('%s(%s)',p.proname,regexp_replace(oidvectortypes(p.proargtypes),'\s*,\s*',',','g')) AS signature,
        pg_get_functiondef(p.oid) AS definition,
        has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
 FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace
   AND p.prosecdef
   AND has_function_privilege('anon',p.oid,'EXECUTE')
), assessed AS (
 SELECT e.signature AS expected_signature,e.category,a.signature AS actual_signature,
        a.oid,a.definition,a.authenticated_execute,a.service_execute
 FROM expected e FULL JOIN actual a ON a.signature=e.signature
)
SELECT (SELECT count(*) FROM expected) AS expected,
       (SELECT count(*) FROM actual) AS actual,
       count(*) FILTER (WHERE expected_signature IS NULL) AS unexpected_public,
       count(*) FILTER (WHERE actual_signature IS NULL) AS missing_public,
       count(*) FILTER (WHERE oid IS NOT NULL AND (NOT authenticated_execute OR NOT service_execute)) AS lost_internal_access,
       count(*) FILTER (WHERE category='KDS' AND oid IS NOT NULL
         AND NOT (definition ~* 'token = p_token' AND definition ~* 'active = true')) AS kds_gate_missing,
       count(*) FILTER (WHERE category='PRECHECKIN' AND oid IS NOT NULL
         AND NOT (definition ~* 'pre_checkin_token_hash = encode\(digest\(p_token'
                  AND definition ~* 'pre_checkin_token_expires_at > now\(\)')) AS precheckin_gate_missing,
       count(*) FILTER (WHERE expected_signature='get_public_site_settings(text)'
         AND oid IS NOT NULL AND NOT definition ~* 'pss.status = ''published''') AS publication_gate_missing,
       (SELECT count(*) FROM public.kds_displays
          WHERE token IS NULL OR token !~ '^[0-9a-f]{64}$') AS malformed_kds_tokens,
       array_remove(array_agg(actual_signature) FILTER (WHERE expected_signature IS NULL),NULL) AS unexpected_signatures,
       array_remove(array_agg(expected_signature) FILTER (WHERE actual_signature IS NULL),NULL) AS missing_signatures
FROM assessed;
