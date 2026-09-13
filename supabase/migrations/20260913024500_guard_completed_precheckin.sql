-- Protege pre-check-ins concluídos contra reabertura administrativa acidental
-- e invalida qualquer token público assim que a conclusão ocorre.

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
    select 1 from public.staff_users s
    where s.id = auth.uid() and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para preparar o pré-check-in.' using errcode = '42501';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if v_res.status <> 'Confirmada' then
    raise exception 'O pré-check-in só pode ser preparado para reservas confirmadas (status atual: %).', v_res.status;
  end if;
  if v_res.pre_checkin_status = 'Concluido' then
    raise exception 'Este pré-check-in já foi concluído e não pode ser reaberto pela preparação administrativa.';
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
      pre_checkin_updated_at = now()
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

create or replace function public.issue_reservation_precheckin_link(p_reservation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_res public.reservations%rowtype;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_users s
    where s.id = auth.uid() and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para gerar link de pré-check-in.' using errcode = '42501';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if v_res.status <> 'Confirmada' then
    raise exception 'O link de pré-check-in só pode ser gerado para reserva confirmada.';
  end if;
  if v_res.pre_checkin_status = 'Concluido' then
    raise exception 'Este pré-check-in já foi concluído. Gere um novo fluxo apenas em outra reserva.';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := least(now() + interval '30 days', ((v_res.check_in_date + 1)::timestamp at time zone 'America/Sao_Paulo'));
  if v_expires_at <= now() then v_expires_at := now() + interval '24 hours'; end if;

  update public.reservations
  set pre_checkin_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      pre_checkin_token_issued_at = now(),
      pre_checkin_token_expires_at = v_expires_at,
      pre_checkin_updated_at = coalesce(pre_checkin_updated_at, now())
  where id = v_res.id;

  return jsonb_build_object('token', v_token, 'expires_at', v_expires_at);
end;
$$;

create or replace function public.invalidate_precheckin_token_on_completion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pre_checkin_status = 'Concluido' and old.pre_checkin_status is distinct from 'Concluido' then
    new.pre_checkin_token_hash := null;
    new.pre_checkin_token_issued_at := null;
    new.pre_checkin_token_expires_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invalidate_precheckin_token_on_completion on public.reservations;
create trigger trg_invalidate_precheckin_token_on_completion
before update of pre_checkin_status on public.reservations
for each row execute function public.invalidate_precheckin_token_on_completion();

revoke all on function public.save_reservation_precheckin_staff(text,text,text,text,text,text,integer,integer,text) from public, anon;
grant execute on function public.save_reservation_precheckin_staff(text,text,text,text,text,text,integer,integer,text) to authenticated;
revoke all on function public.issue_reservation_precheckin_link(text) from public, anon;
grant execute on function public.issue_reservation_precheckin_link(text) to authenticated;
