-- Read-only production audit. Does not return guest data, credentials or tokens.
WITH fn AS (
  SELECT p.oid, lower(pg_get_functiondef(p.oid)) AS body
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.oid='public.complete_reservation_precheckin_public(text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean)'::regprocedure
)
SELECT
  count(*)=1 AS function_present,
  bool_and(position('precheckin_scoped_guest_v1' in body)>0) AS scoped_guest_marker,
  bool_and(position('from public.guests where id=v_res.guest_id' in body)>0) AS only_reservation_guest_lookup,
  bool_and(position('update public.guests' in body)=0 AND position('order by created_at asc' in body)=0) AS no_global_guest_overwrite,
  bool_and(position('pre_checkin_token_hash=encode(digest(p_token' in body)>0 AND position('pre_checkin_token_expires_at>now()' in body)>0) AS token_and_expiration_gate,
  bool_and(position('for update;' in body)>0 AND position('where id=v_res.id;' in body)>0) AS reservation_row_scoped,
  bool_and(has_function_privilege('anon',oid,'EXECUTE') AND has_function_privilege('authenticated',oid,'EXECUTE') AND has_function_privilege('service_role',oid,'EXECUTE')) AS existing_roles_preserved
FROM fn;
