-- NovoHotel — Central de Alertas
-- Recepção: nova reserva online/pending -> alerta setorial.
-- Uma instalação = um hotel.

create or replace function public.create_operational_notification_system(
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_sector text,
  p_source_type text,
  p_source_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification public.operational_notifications%rowtype;
  v_recipient_count integer := 0;
  v_sector text := nullif(trim(coalesce(p_sector, '')), '');
  v_type text := nullif(trim(coalesce(p_type, '')), '');
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_message text := nullif(trim(coalesce(p_message, '')), '');
  v_source_type text := nullif(trim(coalesce(p_source_type, '')), '');
  v_source_id text := nullif(trim(coalesce(p_source_id, '')), '');
begin
  if v_type is null or v_title is null or v_message is null or v_sector is null or v_source_type is null or v_source_id is null then
    return jsonb_build_object('notification', null, 'recipientCount', 0);
  end if;

  if p_priority not in ('info', 'attention', 'critical') then
    return jsonb_build_object('notification', null, 'recipientCount', 0);
  end if;

  insert into public.operational_notifications (
    type, priority, title, message, sector,
    responsible_user_id, source_type, source_id, audience
  ) values (
    v_type, p_priority, v_title, v_message, v_sector,
    null, v_source_type, v_source_id, 'targeted'
  )
  returning * into v_notification;

  insert into public.notification_recipients (notification_id, user_id)
  select v_notification.id, su.id
  from public.staff_users su
  where su.active = true
    and su.sector = v_sector
  on conflict (notification_id, user_id) do nothing;

  get diagnostics v_recipient_count = row_count;

  if v_recipient_count = 0 then
    delete from public.operational_notifications where id = v_notification.id;
    return jsonb_build_object('notification', null, 'recipientCount', 0);
  end if;

  return jsonb_build_object(
    'notification', to_jsonb(v_notification),
    'recipientCount', v_recipient_count
  );
end;
$$;

revoke all on function public.create_operational_notification_system(text, text, text, text, text, text, text) from public;
revoke all on function public.create_operational_notification_system(text, text, text, text, text, text, text) from anon;
revoke all on function public.create_operational_notification_system(text, text, text, text, text, text, text) from authenticated;

comment on function public.create_operational_notification_system(text, text, text, text, text, text, text) is
  'Publicador interno de alertas setoriais para eventos de sistema sem sessão de colaborador. Não é executável por clientes.';

create or replace function public.notify_reception_new_pending_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- O motor público create_reservation_atomic cria reservas como Pendente.
  -- Walk-in/check-in direto usa outro fluxo e já nasce em CheckIn.
  if new.status <> 'Pendente' then
    return new;
  end if;

  begin
    perform public.create_operational_notification_system(
      'reservation_online_created',
      'attention',
      'Nova reserva online ' || coalesce(new.code, ''),
      trim(coalesce(new.guest_name, 'Hóspede')) ||
        ' reservou o quarto ' || coalesce(new.room_number, '—') ||
        ' para entrada em ' || to_char(new.check_in_date, 'DD/MM/YYYY') || '.',
      'Recepcao',
      'reservation',
      new.id
    );
  exception when others then
    -- Alerta nunca pode impedir a reserva.
    null;
  end;

  return new;
end;
$$;

revoke all on function public.notify_reception_new_pending_reservation() from public;
revoke all on function public.notify_reception_new_pending_reservation() from anon;
revoke all on function public.notify_reception_new_pending_reservation() from authenticated;

drop trigger if exists trg_notify_reception_new_pending_reservation on public.reservations;
create trigger trg_notify_reception_new_pending_reservation
after insert on public.reservations
for each row
when (new.status = 'Pendente')
execute function public.notify_reception_new_pending_reservation();
