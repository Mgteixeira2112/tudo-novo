alter table public.reservations
  add column if not exists late_checkout_until timestamptz,
  add column if not exists late_checkout_reason text,
  add column if not exists late_checkout_authorized_at timestamptz,
  add column if not exists late_checkout_authorized_by uuid;

create or replace function public.authorize_overdue_stay_exception_atomic(
  p_reservation_id text,
  p_until_time time,
  p_reason text
)
returns public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_res public.reservations%rowtype;
  v_room public.rooms%rowtype;
  v_now_local timestamp := timezone('America/Sao_Paulo', now());
  v_hotel_date date := timezone('America/Sao_Paulo', now())::date;
  v_until_local timestamp;
  v_until_at timestamptz;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para autorizar permanência excepcional.' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Informe o motivo da permanência excepcional.' using errcode = '22023';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then raise exception 'Reserva não encontrada.'; end if;
  if v_res.status <> 'CheckIn' then raise exception 'Somente hospedagens em Check-in podem receber permanência excepcional.'; end if;
  if v_res.room_id is null then raise exception 'Hospedagem sem quarto vinculado.'; end if;

  select * into v_room
  from public.rooms
  where id = v_res.room_id
  for update;

  if not found then raise exception 'Quarto vinculado não encontrado.'; end if;
  if v_room.current_reservation_id is distinct from v_res.id then
    raise exception 'O quarto não está mais vinculado a esta hospedagem.';
  end if;

  v_until_local := v_hotel_date + p_until_time;
  if v_until_local <= v_now_local then
    raise exception 'O horário excepcional deve ser posterior ao horário atual.';
  end if;

  if exists (
    select 1
    from public.reservations x
    where x.id <> v_res.id
      and x.room_id = v_res.room_id
      and x.status in ('Pendente','Confirmada','CheckIn')
      and x.check_in_date <= v_hotel_date
  ) then
    raise exception 'Não é possível autorizar permanência excepcional: existe outra reserva aguardando este quarto.';
  end if;

  v_until_at := v_until_local at time zone 'America/Sao_Paulo';

  update public.reservations
  set late_checkout_until = v_until_at,
      late_checkout_reason = trim(p_reason),
      late_checkout_authorized_at = now(),
      late_checkout_authorized_by = auth.uid(),
      notes = concat_ws(E'\n', nullif(notes, ''), concat('Permanência excepcional autorizada até ', to_char(v_until_local, 'DD/MM/YYYY HH24:MI'), '. Motivo: ', trim(p_reason)))
  where id = v_res.id
  returning * into v_res;

  update public.rooms
  set status = 'Ocupado',
      notes = concat('Permanência excepcional autorizada até ', to_char(v_until_local, 'DD/MM/YYYY HH24:MI'), ' para ', v_res.guest_name, '.')
  where id = v_room.id;

  delete from public.operational_notifications
  where type = 'reception_overstay'
    and lower(coalesce(source_type, '')) = 'reservation'
    and source_id = v_res.id;

  return v_res;
end;
$$;

revoke all on function public.authorize_overdue_stay_exception_atomic(text,time,text) from public;
grant execute on function public.authorize_overdue_stay_exception_atomic(text,time,text) to authenticated;

create or replace function public.reconcile_overdue_stays()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_checkout_time time := '11:00';
  v_now_local timestamp := timezone('America/Sao_Paulo', now());
  v_due_local timestamp;
  v_due_at timestamptz;
  v_notification_id uuid;
  v_blocked integer := 0;
  v_alerted integer := 0;
  v_rec record;
begin
  select coalesce(nullif(trim(check_out_time::text), ''), '11:00')::time
    into v_checkout_time
  from public.hotel_settings
  limit 1;

  v_checkout_time := coalesce(v_checkout_time, '11:00'::time);

  for v_rec in
    select
      r.id, r.code, r.guest_name, r.room_id, r.room_number, r.check_out_date, r.late_checkout_until,
      greatest(
        r.check_out_date + v_checkout_time,
        coalesce(timezone('America/Sao_Paulo', r.late_checkout_until), r.check_out_date + v_checkout_time)
      ) as effective_due_local
    from public.reservations r
    where r.status = 'CheckIn'
      and r.room_id is not null
      and greatest(
        r.check_out_date + v_checkout_time,
        coalesce(timezone('America/Sao_Paulo', r.late_checkout_until), r.check_out_date + v_checkout_time)
      ) <= v_now_local
    order by effective_due_local, r.room_number
  loop
    v_due_local := v_rec.effective_due_local;
    v_due_at := v_due_local at time zone 'America/Sao_Paulo';

    update public.rooms
       set status = 'Bloqueado',
           notes = concat(
             'Hospedagem vencida — regularização obrigatória. Reserva ',
             v_rec.code, ' • ', v_rec.guest_name,
             ' • checkout previsto ', to_char(v_due_local, 'DD/MM/YYYY HH24:MI'), '.'
           )
     where id = v_rec.room_id
       and current_reservation_id = v_rec.id
       and status = 'Ocupado';

    if found then v_blocked := v_blocked + 1; end if;

    if not exists (
      select 1
      from public.operational_notifications n
      where n.type = 'reception_overstay'
        and lower(coalesce(n.source_type, '')) = 'reservation'
        and n.source_id = v_rec.id
        and n.created_at >= v_due_at
    ) then
      insert into public.operational_notifications (
        type, priority, title, message, sector, responsible_user_id, source_type, source_id, audience
      ) values (
        'reception_overstay', 'critical',
        'Hospedagem vencida — Quarto ' || coalesce(v_rec.room_number, '—'),
        concat('A reserva ', v_rec.code, ' de ', v_rec.guest_name,
          ' ultrapassou o checkout previsto de ', to_char(v_due_local, 'DD/MM/YYYY HH24:MI'),
          '. O quarto foi bloqueado e precisa ser regularizado pela Recepção.'),
        'Recepcao', null, 'reservation', v_rec.id, 'targeted'
      ) returning id into v_notification_id;

      insert into public.notification_recipients (notification_id, user_id)
      select v_notification_id, su.id
      from public.staff_users su
      where su.active = true and (su.sector = 'Recepcao' or su.role = 'admin')
      on conflict (notification_id, user_id) do nothing;

      v_alerted := v_alerted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'checkedAt', now(),
    'checkoutTime', to_char(v_checkout_time, 'HH24:MI'),
    'blockedRooms', v_blocked,
    'alertsCreated', v_alerted
  );
end;
$$;

revoke all on function public.reconcile_overdue_stays() from public;
revoke all on function public.reconcile_overdue_stays() from anon;
revoke all on function public.reconcile_overdue_stays() from authenticated;
