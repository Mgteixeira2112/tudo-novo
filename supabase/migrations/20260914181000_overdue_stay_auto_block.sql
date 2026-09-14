-- Govermix / NovoHotel — Hospedagens vencidas
-- Regra operacional: após check_out_date + horário oficial de checkout,
-- toda reserva ainda em CheckIn bloqueia o quarto e gera alerta crítico.
-- A regularização continua possível pelo fluxo de Checkout da própria reserva.

create extension if not exists pg_cron with schema pg_catalog;

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
      r.id,
      r.code,
      r.guest_name,
      r.room_id,
      r.room_number,
      r.check_out_date
    from public.reservations r
    where r.status = 'CheckIn'
      and r.room_id is not null
      and (r.check_out_date + v_checkout_time) <= v_now_local
    order by r.check_out_date, r.room_number
  loop
    v_due_local := v_rec.check_out_date + v_checkout_time;
    v_due_at := v_due_local at time zone 'America/Sao_Paulo';

    update public.rooms
       set status = 'Bloqueado',
           notes = concat(
             'Hospedagem vencida — regularização obrigatória. Reserva ',
             v_rec.code,
             ' • ',
             v_rec.guest_name,
             ' • checkout previsto ',
             to_char(v_due_local, 'DD/MM/YYYY HH24:MI'),
             '.'
           )
     where id = v_rec.room_id
       and current_reservation_id = v_rec.id
       and status = 'Ocupado';

    if found then
      v_blocked := v_blocked + 1;
    end if;

    if not exists (
      select 1
      from public.operational_notifications n
      where n.type = 'reception_overstay'
        and lower(coalesce(n.source_type, '')) = 'reservation'
        and n.source_id = v_rec.id
        and n.created_at >= v_due_at
    ) then
      insert into public.operational_notifications (
        type,
        priority,
        title,
        message,
        sector,
        responsible_user_id,
        source_type,
        source_id,
        audience
      ) values (
        'reception_overstay',
        'critical',
        'Hospedagem vencida — Quarto ' || coalesce(v_rec.room_number, '—'),
        concat(
          'A reserva ', v_rec.code, ' de ', v_rec.guest_name,
          ' ultrapassou o checkout previsto de ',
          to_char(v_due_local, 'DD/MM/YYYY HH24:MI'),
          '. O quarto foi bloqueado e precisa ser regularizado pela Recepção.'
        ),
        'Recepcao',
        null,
        'reservation',
        v_rec.id,
        'targeted'
      ) returning id into v_notification_id;

      insert into public.notification_recipients (notification_id, user_id)
      select v_notification_id, su.id
      from public.staff_users su
      where su.active = true
        and (su.sector = 'Recepcao' or su.role = 'admin')
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

-- O checkout precisa continuar possível quando o quarto foi bloqueado
-- automaticamente pela própria hospedagem vencida.
do $$
declare
  v_def text;
  v_old text := 'if v_room.status<>''Ocupado'' or v_room.current_reservation_id is distinct from v_res.id then';
  v_new text := 'if v_room.status not in (''Ocupado'',''Bloqueado'') or v_room.current_reservation_id is distinct from v_res.id then';
begin
  select pg_get_functiondef(
    'public.process_checkout_atomic(text,text,numeric,numeric,text,text)'::regprocedure
  ) into v_def;

  if position(v_old in v_def) = 0 then
    raise exception 'Trecho esperado de process_checkout_atomic não encontrado; migration interrompida por segurança.';
  end if;

  v_def := replace(v_def, v_old, v_new);
  v_def := replace(
    v_def,
    'raise exception ''O quarto % não está ocupado por esta reserva.'',v_room.number;',
    'raise exception ''O quarto % não está ocupado/bloqueado por esta reserva.'',v_room.number;'
  );

  execute v_def;
end;
$$;

-- O job é idempotente por nome: executar novamente substitui a agenda existente.
select cron.schedule(
  'govermix-reconcile-overdue-stays',
  '* * * * *',
  'select public.reconcile_overdue_stays();'
);

-- Aplica a regra imediatamente às hospedagens já vencidas no momento da migration.
select public.reconcile_overdue_stays();
