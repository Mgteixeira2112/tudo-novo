-- Govermix: pedidos de Cozinha/Room Service devem sempre gerar alerta operacional
-- diretamente no banco. Isso elimina dependência de wrappers do frontend e garante
-- que qualquer pedido persistido em kitchen_orders tenha notificação correspondente.

create or replace function public.notify_kitchen_order_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification_id uuid;
  v_message text;
begin
  select id into v_notification_id
  from public.operational_notifications
  where type = 'kitchen_order_created'
    and source_type = 'kitchen_order'
    and source_id = new.id
  order by created_at asc
  limit 1;

  if v_notification_id is not null then
    return new;
  end if;

  v_message := concat_ws(
    ' • ',
    case when nullif(new.room_number, '') is not null then 'Quarto ' || new.room_number end,
    nullif(new.guest_name, ''),
    case when nullif(new.destination, '') is not null then 'Destino: ' || new.destination end,
    case when jsonb_typeof(new.items) = 'array' then jsonb_array_length(new.items)::text || ' item(ns)' end,
    nullif(new.special_instructions, '')
  );

  insert into public.operational_notifications (
    type, priority, title, message, sector, responsible_user_id,
    source_type, source_id, audience
  ) values (
    'kitchen_order_created',
    'attention',
    'Novo pedido: ' || new.order_number,
    coalesce(nullif(v_message, ''), 'Novo pedido recebido.'),
    'Cozinha',
    null,
    'kitchen_order',
    new.id,
    'targeted'
  )
  returning id into v_notification_id;

  insert into public.notification_recipients (notification_id, user_id)
  select v_notification_id, su.id
  from public.staff_users su
  where su.active = true
    and (
      su.sector = 'Cozinha'
      or su.role = 'admin'
      or su.permissions ? 'manage_fnb'
    )
  on conflict (notification_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_kitchen_order_created_notification on public.kitchen_orders;

create trigger trg_kitchen_order_created_notification
after insert on public.kitchen_orders
for each row
execute function public.notify_kitchen_order_created();
