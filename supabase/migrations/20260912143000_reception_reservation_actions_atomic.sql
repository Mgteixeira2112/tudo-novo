-- Reception: secure reservation actions for the static/GitHub Pages frontend.
-- Keeps reservation mutation behind authenticated SECURITY DEFINER RPCs because
-- reservations has SELECT-only RLS for staff users.

create or replace function public.confirm_reservation_atomic(
  p_reservation_id text
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para confirmar reservas.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status <> 'Pendente' then
    raise exception 'Somente reservas pendentes podem ser confirmadas (status atual: %).', v_res.status;
  end if;

  update public.reservations
  set status = 'Confirmada'
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

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
      notes = concat_ws(' | ', nullif(notes, ''), v_audit)
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

create or replace function public.update_reservation_atomic(
  p_reservation_id text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_check_in_date date,
  p_check_out_date date,
  p_adults integer,
  p_children integer,
  p_notes text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_room public.rooms%rowtype;
  v_hotel_date date := (timezone('America/Sao_Paulo', now()))::date;
  v_nights integer;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para editar reservas.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status not in ('Pendente', 'Confirmada') then
    raise exception 'Somente reservas pendentes ou confirmadas podem ser editadas (status atual: %).', v_res.status;
  end if;

  if nullif(trim(coalesce(p_guest_name, '')), '') is null then
    raise exception 'Informe o nome do hóspede.';
  end if;

  if nullif(trim(coalesce(p_guest_email, '')), '') is null then
    raise exception 'Informe o e-mail do hóspede.';
  end if;

  if p_check_in_date is null or p_check_out_date is null or p_check_out_date <= p_check_in_date then
    raise exception 'A data de saída deve ser posterior à data de entrada.';
  end if;

  if p_check_out_date <= v_hotel_date then
    raise exception 'A saída da reserva deve ser posterior à data operacional atual (%).', to_char(v_hotel_date, 'DD/MM/YYYY');
  end if;

  if coalesce(p_adults, 0) < 1 or coalesce(p_children, 0) < 0 then
    raise exception 'A reserva deve ter ao menos 1 adulto e não pode ter quantidade negativa de crianças.';
  end if;

  if v_res.room_id is null then
    raise exception 'A reserva não possui quarto vinculado.';
  end if;

  select * into v_room
  from public.rooms
  where id = v_res.room_id;

  if not found then
    raise exception 'O quarto vinculado à reserva não foi encontrado.';
  end if;

  if (coalesce(p_adults, 0) + coalesce(p_children, 0)) > v_room.capacity then
    raise exception 'A ocupação informada (% hóspede(s)) excede a capacidade do quarto % (% hóspede(s)).',
      (coalesce(p_adults, 0) + coalesce(p_children, 0)), v_room.number, v_room.capacity;
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.id <> v_res.id
      and r.room_id = v_res.room_id
      and r.status in ('Pendente', 'Confirmada', 'CheckIn')
      and daterange(r.check_in_date, r.check_out_date, '[)') && daterange(p_check_in_date, p_check_out_date, '[)')
  ) then
    raise exception 'O quarto % possui outra reserva ativa no período informado.', v_room.number;
  end if;

  v_nights := p_check_out_date - p_check_in_date;

  update public.reservations
  set guest_name = trim(p_guest_name),
      guest_email = trim(p_guest_email),
      guest_phone = trim(coalesce(p_guest_phone, '')),
      check_in_date = p_check_in_date,
      check_out_date = p_check_out_date,
      nights = v_nights,
      adults = p_adults,
      children = p_children,
      total_nights_amount = v_nights * price_per_night,
      notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

revoke all on function public.confirm_reservation_atomic(text) from public, anon;
revoke all on function public.cancel_reservation_atomic(text, text) from public, anon;
revoke all on function public.update_reservation_atomic(text, text, text, text, date, date, integer, integer, text) from public, anon;

grant execute on function public.confirm_reservation_atomic(text) to authenticated;
grant execute on function public.cancel_reservation_atomic(text, text) to authenticated;
grant execute on function public.update_reservation_atomic(text, text, text, text, date, date, integer, integer, text) to authenticated;
