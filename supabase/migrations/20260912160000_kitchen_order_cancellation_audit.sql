-- Cancelamento auditado de pedidos de Cozinha / Room Service.
-- Preserva histórico financeiro, estoque e Kardex sem apagar dados operacionais.

alter table public.kitchen_orders
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_production_state text,
  add column if not exists cancellation_stock_treatment text,
  add column if not exists cancellation_stock_details jsonb not null default '[]'::jsonb,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.staff_users(id) on delete set null,
  add column if not exists cancelled_by_name text,
  add column if not exists status_before_cancel text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'kitchen_orders_cancel_production_state_check'
  ) then
    alter table public.kitchen_orders
      add constraint kitchen_orders_cancel_production_state_check
      check (
        cancellation_production_state is null
        or cancellation_production_state in ('Nao_Iniciado','Parcialmente_Preparado','Totalmente_Preparado')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'kitchen_orders_cancel_stock_treatment_check'
  ) then
    alter table public.kitchen_orders
      add constraint kitchen_orders_cancel_stock_treatment_check
      check (
        cancellation_stock_treatment is null
        or cancellation_stock_treatment in ('Retorno_Total','Perda_Total','Retorno_Parcial')
      );
  end if;
end $$;

create or replace function public.get_kitchen_order_cancellation_context(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_order public.kitchen_orders%rowtype;
  v_stock jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (v_staff.role = 'admin' or coalesce(v_staff.permissions,'[]'::jsonb) ? 'manage_fnb') then
    raise exception 'Permissão insuficiente para cancelar pedido.' using errcode='42501';
  end if;

  select * into v_order
  from public.kitchen_orders
  where id = p_order_id;

  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_order.status = 'Entregue' then
    raise exception 'Pedido já entregue não pode ser cancelado. Utilize um fluxo de estorno/cortesia.';
  end if;
  if v_order.status = 'Cancelado' then
    raise exception 'Pedido já está cancelado.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'itemId', q.item_id,
    'itemName', q.item_name,
    'requiredQuantity', q.required_qty,
    'unit', q.unit,
    'unitCost', q.unit_cost
  ) order by q.item_name), '[]'::jsonb)
  into v_stock
  from (
    select sm.item_id,
           max(sm.item_name) as item_name,
           sum(sm.quantity) as required_qty,
           max(ii.unit) as unit,
           max(sm.unit_cost) as unit_cost
    from public.stock_movements sm
    join public.inventory_items ii on ii.id = sm.item_id
    where sm.related_order_id = v_order.id
      and sm.type = 'Saida_Venda_A_B'
    group by sm.item_id
  ) q;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'stockItems', v_stock
  );
end;
$$;

create or replace function public.update_kitchen_order_status_atomic(
  p_order_id text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_order public.kitchen_orders%rowtype;
  v_valid boolean := false;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (v_staff.role = 'admin' or coalesce(v_staff.permissions,'[]'::jsonb) ? 'manage_fnb') then
    raise exception 'Permissão insuficiente para alterar pedido.' using errcode='42501';
  end if;

  select * into v_order
  from public.kitchen_orders
  where id = p_order_id
  for update;

  if not found then raise exception 'Pedido não encontrado.'; end if;

  if p_status = 'Cancelado' then
    raise exception 'Use o cancelamento auditado para cancelar pedidos.';
  end if;

  v_valid :=
    (v_order.status = 'Recebido' and p_status = 'Em Preparo')
    or (v_order.status = 'Em Preparo' and p_status = 'Pronto')
    or (v_order.status = 'Pronto' and p_status = 'Entregue');

  if not v_valid then
    raise exception 'Transição de status inválida: % -> %.', v_order.status, p_status;
  end if;

  update public.kitchen_orders
  set status = p_status,
      completed_at = case when p_status = 'Entregue' then now() else completed_at end
  where id = v_order.id
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

create or replace function public.cancel_kitchen_order_atomic(
  p_order_id text,
  p_reason text,
  p_production_state text,
  p_stock_treatment text,
  p_returned_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_order public.kitchen_orders%rowtype;
  v_inv public.inventory_items%rowtype;
  v_req record;
  v_now timestamptz := now();
  v_returned numeric;
  v_lost numeric;
  v_prev numeric;
  v_next numeric;
  v_details jsonb := '[]'::jsonb;
  v_reason text := nullif(trim(coalesce(p_reason,'')), '');
  v_source_movement_id text;
  v_refund_movement_id text;
  v_paid_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (v_staff.role = 'admin' or coalesce(v_staff.permissions,'[]'::jsonb) ? 'manage_fnb') then
    raise exception 'Permissão insuficiente para cancelar pedido.' using errcode='42501';
  end if;

  if v_reason is null or length(v_reason) < 3 then
    raise exception 'Informe o motivo do cancelamento.';
  end if;

  if p_production_state not in ('Nao_Iniciado','Parcialmente_Preparado','Totalmente_Preparado') then
    raise exception 'Situação de produção inválida.';
  end if;

  if p_stock_treatment not in ('Retorno_Total','Perda_Total','Retorno_Parcial') then
    raise exception 'Tratamento de estoque inválido.';
  end if;

  if p_stock_treatment = 'Retorno_Parcial' and jsonb_typeof(coalesce(p_returned_items,'[]'::jsonb)) <> 'array' then
    raise exception 'Itens de retorno parcial inválidos.';
  end if;

  select * into v_order
  from public.kitchen_orders
  where id = p_order_id
  for update;

  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_order.status = 'Entregue' then
    raise exception 'Pedido já entregue não pode ser cancelado. Utilize um fluxo de estorno/cortesia.';
  end if;
  if v_order.status = 'Cancelado' then
    raise exception 'Pedido já está cancelado.';
  end if;
  if v_order.status not in ('Recebido','Em Preparo','Pronto') then
    raise exception 'Status atual não permite cancelamento: %.', v_order.status;
  end if;

  select count(*) into v_paid_count
  from public.financial_transactions ft
  where ft.reservation_id = v_order.reservation_id
    and ft.type = 'Receita'
    and ft.category = 'Room Service'
    and ft.status = 'Pago'
    and ft.description like '%' || v_order.order_number || '%';

  if v_paid_count > 0 then
    raise exception 'Pedido já possui cobrança paga. Utilize um fluxo de estorno/cortesia.';
  end if;

  for v_req in
    select sm.item_id,
           max(sm.item_name) as item_name,
           sum(sm.quantity) as required_qty,
           max(ii.unit) as unit,
           max(sm.unit_cost) as unit_cost,
           min(sm.id) as source_movement_id
    from public.stock_movements sm
    join public.inventory_items ii on ii.id = sm.item_id
    where sm.related_order_id = v_order.id
      and sm.type = 'Saida_Venda_A_B'
    group by sm.item_id
    order by sm.item_id
  loop
    if p_stock_treatment = 'Retorno_Total' then
      v_returned := v_req.required_qty;
    elsif p_stock_treatment = 'Perda_Total' then
      v_returned := 0;
    else
      select coalesce((entry->>'quantity')::numeric, 0)
      into v_returned
      from jsonb_array_elements(coalesce(p_returned_items,'[]'::jsonb)) entry
      where entry->>'itemId' = v_req.item_id
      limit 1;
      v_returned := coalesce(v_returned,0);
    end if;

    if v_returned < 0 or v_returned > v_req.required_qty then
      raise exception 'Quantidade de retorno inválida para %. Máximo: % %.', v_req.item_name, v_req.required_qty, v_req.unit;
    end if;

    v_lost := v_req.required_qty - v_returned;
    v_source_movement_id := v_req.source_movement_id;
    v_refund_movement_id := null;

    if v_returned > 0 then
      select * into v_inv
      from public.inventory_items
      where id = v_req.item_id
      for update;

      if not found then raise exception 'Item de estoque não encontrado: %.', v_req.item_name; end if;

      v_prev := v_inv.current_stock;
      v_next := v_prev + v_returned;

      update public.inventory_items
      set current_stock = v_next,
          updated_at = v_now
      where id = v_inv.id;

      v_refund_movement_id := 'mov_' || replace(gen_random_uuid()::text,'-','');
      insert into public.stock_movements(
        id, timestamp, item_id, item_name, sector, type, quantity,
        previous_stock, new_stock, unit_cost, total_cost,
        origin_location, destination_location,
        related_room_number, related_reservation_id, related_order_id,
        operator, document_number, notes
      ) values (
        v_refund_movement_id, v_now, v_inv.id, v_inv.name, v_inv.sector,
        'Ajuste_Inventario', v_returned, v_prev, v_next,
        v_inv.cost_price, v_inv.cost_price * v_returned,
        'Cozinha / A&B', coalesce(v_inv.location_barcode,'Estoque'),
        v_order.room_number, v_order.reservation_id, v_order.id,
        coalesce(v_staff.full_name,'Sistema'), v_order.order_number,
        'Retorno ao estoque por cancelamento auditado do pedido ' || v_order.order_number || ': ' || v_reason
      );
    end if;

    if v_lost > 0 then
      insert into public.inventory_loss_damage_events(
        id, item_id, item_name, occurrence_type, quantity, unit,
        definitive, source_location, room_number, operator, notes,
        stock_movement_id, created_at
      ) values (
        'loss_' || replace(gen_random_uuid()::text,'-',''),
        v_req.item_id, v_req.item_name, 'Descarte', v_lost, v_req.unit,
        true, 'Cozinha / A&B', v_order.room_number,
        coalesce(v_staff.full_name,'Sistema'),
        'Perda por cancelamento do pedido ' || v_order.order_number ||
          ' após produção (' || p_production_state || '). Motivo: ' || v_reason,
        v_source_movement_id, v_now
      );
    end if;

    v_details := v_details || jsonb_build_array(jsonb_build_object(
      'itemId', v_req.item_id,
      'itemName', v_req.item_name,
      'requiredQuantity', v_req.required_qty,
      'returnedQuantity', v_returned,
      'lostQuantity', v_lost,
      'unit', v_req.unit,
      'unitCost', v_req.unit_cost,
      'sourceMovementId', v_source_movement_id,
      'returnMovementId', v_refund_movement_id
    ));
  end loop;

  -- Preserva a projeção financeira como registro auditável, mas fora do saldo.
  update public.financial_transactions ft
  set status = 'Cancelado',
      description = ft.description || ' | Cancelado: ' || v_reason
  where ft.reservation_id = v_order.reservation_id
    and ft.type = 'Receita'
    and ft.category = 'Room Service'
    and ft.status = 'Pendente'
    and ft.description like '%' || v_order.order_number || '%';

  update public.kitchen_orders
  set status_before_cancel = v_order.status,
      status = 'Cancelado',
      cancellation_reason = v_reason,
      cancellation_production_state = p_production_state,
      cancellation_stock_treatment = p_stock_treatment,
      cancellation_stock_details = v_details,
      cancelled_at = v_now,
      cancelled_by = v_staff.id,
      cancelled_by_name = v_staff.full_name,
      completed_at = v_now
  where id = v_order.id
  returning * into v_order;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'stockDetails', v_details
  );
end;
$$;

-- O cliente autenticado continua podendo ler pedidos, mas toda mutação passa por RPC atômica.
revoke insert, update, delete, truncate on table public.kitchen_orders from authenticated;
revoke insert, update, delete, truncate on table public.kitchen_orders from anon;
grant select on table public.kitchen_orders to authenticated;

revoke all on function public.get_kitchen_order_cancellation_context(text) from public;
revoke all on function public.get_kitchen_order_cancellation_context(text) from anon;
grant execute on function public.get_kitchen_order_cancellation_context(text) to authenticated;

revoke all on function public.update_kitchen_order_status_atomic(text,text) from public;
revoke all on function public.update_kitchen_order_status_atomic(text,text) from anon;
grant execute on function public.update_kitchen_order_status_atomic(text,text) to authenticated;

revoke all on function public.cancel_kitchen_order_atomic(text,text,text,text,jsonb) from public;
revoke all on function public.cancel_kitchen_order_atomic(text,text,text,text,jsonb) from anon;
grant execute on function public.cancel_kitchen_order_atomic(text,text,text,text,jsonb) to authenticated;
