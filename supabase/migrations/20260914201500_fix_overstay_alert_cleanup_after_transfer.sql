-- Fix alert cleanup after overdue stay transfer.
-- The transfer function used source_type = 'Reserva', while overdue alerts are stored
-- with source_type = 'reservation'. Keep the correction isolated in a forward migration.

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(
    'public.extend_overdue_stay_with_transfer_atomic(text,date,text,text)'::regprocedure
  ) into v_sql;

  v_sql := replace(
    v_sql,
    'source_type = ''Reserva''',
    'source_type = ''reservation'''
  );

  execute v_sql;
end;
$$;

-- Remove only stale overstay alerts whose reservation is no longer overdue.
-- Active overdue stays (for example, a reservation still in CheckIn with checkout in
-- the past) remain untouched.
delete from public.operational_notifications n
using public.reservations r
where n.type = 'reception_overstay'
  and lower(n.source_type) in ('reservation', 'reserva')
  and n.source_id = r.id
  and (
    r.status <> 'CheckIn'
    or r.check_out_date > (timezone('America/Sao_Paulo', now()))::date
  );
