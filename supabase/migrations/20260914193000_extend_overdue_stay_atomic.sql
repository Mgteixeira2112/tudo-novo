create or replace function public.extend_overdue_stay_atomic(
  p_reservation_id text,
  p_new_check_out_date date,
  p_reason text default null
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
    raise exception 'Permissão insuficiente para prorrogar hospedagem.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status <> 'CheckIn' then
    raise exception 'Somente hospedagens em Check-in podem ser prorrogadas.';
  end if;

  if v_res.room_id is null then
    raise exception 'A hospedagem não possui quarto vinculado.';
  end if;

  select * into v_room
  from public.rooms
  where id = v_res.room_id
  for update;

  if not found then
    raise exception 'O quarto vinculado à hospedagem não foi encontrado.';
  end if;

  if v_room.current_reservation_id is distinct from v_res.id then
    raise exception 'O quarto não está mais vinculado a esta hospedagem.';
  end if;

  if p_new_check_out_date is null or p_new_check_out_date <= v_hotel_date then
    raise exception 'A nova saída deve ser posterior à data operacional atual (%).', to_char(v_hotel_date, 'DD/MM/YYYY');
  end if;

  if p_new_check_out_date <= v_res.check_out_date then
    raise exception 'A nova saída deve ser posterior à saída atual (%).', to_char(v_res.check_out_date, 'DD/MM/YYYY');
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.id <> v_res.id
      and r.room_id = v_res.room_id
      and r.status in ('Pendente', 'Confirmada', 'CheckIn')
      and daterange(r.check_in_date, r.check_out_date, '[)') && daterange(v_res.check_in_date, p_new_check_out_date, '[)')
  ) then
    raise exception 'O quarto % possui outra reserva ativa no novo período.', v_room.number;
  end if;

  v_nights := p_new_check_out_date - v_res.check_in_date;

  update public.reservations
  set check_out_date = p_new_check_out_date,
      nights = v_nights,
      total_nights_amount = v_nights * price_per_night,
      notes = case
        when nullif(trim(coalesce(p_reason, '')), '') is null then notes
        when nullif(trim(coalesce(notes, '')), '') is null then concat('Prorrogação de hospedagem: ', trim(p_reason))
        else concat(notes, E'\nProrrogação de hospedagem: ', trim(p_reason))
      end
  where id = v_res.id
  returning * into v_res;

  update public.rooms
  set status = 'Ocupado',
      notes = case
        when nullif(trim(coalesce(p_reason, '')), '') is null then concat('Hospedagem prorrogada até ', to_char(p_new_check_out_date, 'DD/MM/YYYY'), '.')
        else concat('Hospedagem prorrogada até ', to_char(p_new_check_out_date, 'DD/MM/YYYY'), '. ', trim(p_reason))
      end
  where id = v_room.id;

  return v_res;
end;
$$;

revoke all on function public.extend_overdue_stay_atomic(text,date,text) from public;
grant execute on function public.extend_overdue_stay_atomic(text,date,text) to authenticated;
