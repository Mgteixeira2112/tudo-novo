-- Reception hardening: revoke any public pre-check-in token when a reservation is cancelled.
-- Legal/pre-check-in history remains preserved; only the reusable access token is invalidated.

create or replace function public.cancel_reservation_atomic(
  p_reservation_id text,
  p_reason text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_audit text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para cancelar reservas.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status not in ('Pendente', 'Confirmada') then
    raise exception 'A reserva não pode ser cancelada no status atual (%).', v_res.status;
  end if;

  v_audit := '[Cancelamento ' || to_char(timezone('America/Sao_Paulo', now()), 'DD/MM/YYYY HH24:MI') || ']';
  if v_reason is not null then
    v_audit := v_audit || ' ' || v_reason;
  end if;

  update public.reservations
  set status = 'Cancelada',
      notes = concat_ws(' | ', nullif(notes, ''), v_audit),
      pre_checkin_token_hash = null,
      pre_checkin_token_issued_at = null,
      pre_checkin_token_expires_at = null
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

revoke all on function public.cancel_reservation_atomic(text, text) from public, anon;
grant execute on function public.cancel_reservation_atomic(text, text) to authenticated;
