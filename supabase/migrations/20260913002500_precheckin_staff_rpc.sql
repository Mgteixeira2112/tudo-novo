-- Preparação administrativa do pré-check-in.
-- Não conclui o pré-check-in e não registra aceite de termos em nome do hóspede.

create or replace function public.save_reservation_precheckin_staff(
  p_reservation_id text,
  p_travel_reason text default null,
  p_travel_origin text default null,
  p_next_destination text default null,
  p_transport_mode text default null,
  p_vehicle_plate text default null,
  p_minors_count integer default 0,
  p_legally_incapable_count integer default 0,
  p_responsibility_notes text default null
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
    raise exception 'Permissão insuficiente para preparar o pré-check-in.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status <> 'Confirmada' then
    raise exception 'O pré-check-in só pode ser preparado para reservas confirmadas (status atual: %).', v_res.status;
  end if;

  if coalesce(p_minors_count, 0) < 0 or coalesce(p_legally_incapable_count, 0) < 0 then
    raise exception 'As quantidades vinculadas não podem ser negativas.';
  end if;

  if coalesce(p_minors_count, 0) > coalesce(v_res.children, 0) then
    raise exception 'A quantidade de menores vinculados não pode superar a quantidade de crianças da reserva (%).', v_res.children;
  end if;

  update public.reservations
  set travel_reason = nullif(trim(coalesce(p_travel_reason, '')), ''),
      travel_origin = nullif(trim(coalesce(p_travel_origin, '')), ''),
      next_destination = nullif(trim(coalesce(p_next_destination, '')), ''),
      transport_mode = nullif(trim(coalesce(p_transport_mode, '')), ''),
      vehicle_plate = nullif(upper(trim(coalesce(p_vehicle_plate, ''))), ''),
      minors_count = coalesce(p_minors_count, 0),
      legally_incapable_count = coalesce(p_legally_incapable_count, 0),
      responsibility_notes = nullif(trim(coalesce(p_responsibility_notes, '')), ''),
      pre_checkin_status = 'EmAndamento',
      pre_checkin_updated_at = now(),
      pre_checked_in_at = null,
      terms_accepted_at = null,
      terms_version = null
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

revoke all on function public.save_reservation_precheckin_staff(text, text, text, text, text, text, integer, integer, text) from public, anon;
grant execute on function public.save_reservation_precheckin_staff(text, text, text, text, text, text, integer, integer, text) to authenticated;
