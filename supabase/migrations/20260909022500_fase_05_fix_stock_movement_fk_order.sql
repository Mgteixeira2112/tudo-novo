-- FASE 5 — corrige a ordem transacional entre kitchen_orders e stock_movements
-- Valida todo o estoque primeiro, cria o pedido e só então grava as baixas/Kardex.
-- Qualquer erro posterior reverte pedido, estoque, Kardex e financeiro na mesma transação.

create or replace function public.create_kitchen_order_atomic(
  p_room_id text,
  p_items jsonb,
  p_destination text,
  p_delivery_sector text,
  p_special_instructions text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_room public.rooms%rowtype;
  v_res public.reservations%rowtype;
  v_menu public.menu_items%rowtype;
  v_inv public.inventory_items%rowtype;
  v_order public.kitchen_orders%rowtype;
  v_entry jsonb;
  v_norm jsonb := '[]'::jsonb;
  v_qty integer;
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_now timestamptz := now();
  v_order_id text := 'ord_' || replace(gen_random_uuid()::text,'-','');
  v_order_number text := 'RS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_prev numeric;
  v_next numeric;
  v_req record;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (v_staff.role = 'admin' or v_staff.permissions ? 'manage_fnb') then
    raise exception 'Permissão insuficiente para criar pedido.';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 20 then
    raise exception 'O pedido deve conter entre 1 e 20 itens.';
  end if;

  if p_destination not in ('Quarto','Restaurante','Piscina') then raise exception 'Destino inválido.'; end if;
  if p_delivery_sector not in ('Cozinha','Room Service') then raise exception 'Setor de entrega inválido.'; end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Quarto não encontrado.'; end if;
  if v_room.status <> 'Ocupado' or v_room.current_reservation_id is null then
    raise exception 'O quarto precisa estar ocupado por uma reserva ativa.';
  end if;

  select * into v_res from public.reservations where id = v_room.current_reservation_id for update;
  if not found or v_res.status <> 'CheckIn' or v_res.room_id <> v_room.id then
    raise exception 'Reserva ativa do quarto não encontrada.';
  end if;

  for v_entry in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := coalesce((v_entry->>'quantity')::integer, 0);
    exception when others then
      raise exception 'Quantidade de item inválida.';
    end;

    if v_qty <= 0 or v_qty > 20 then raise exception 'Quantidade de item inválida.'; end if;

    select * into v_menu from public.menu_items where id = v_entry->>'menuItemId' and available = true;
    if not found then raise exception 'Item de cardápio inválido ou indisponível.'; end if;

    if v_menu.operational_type is null then
      raise exception 'Item % ainda não possui classificação operacional.', v_menu.name;
    end if;
    if v_menu.operational_type = 'simple' and v_menu.simple_inventory_item_id is null then
      raise exception 'Produto simples % não possui vínculo de estoque.', v_menu.name;
    end if;
    if v_menu.operational_type = 'recipe'
       and not exists (select 1 from public.menu_item_ingredients mi where mi.menu_item_id = v_menu.id) then
      raise exception 'Receita % não possui ficha técnica cadastrada.', v_menu.name;
    end if;

    v_subtotal := v_subtotal + (v_menu.price * v_qty);
    v_norm := v_norm || jsonb_build_array(jsonb_build_object(
      'menuItemId', v_menu.id,
      'name', v_menu.name,
      'price', v_menu.price,
      'unitPrice', v_menu.price,
      'quantity', v_qty,
      'notes', coalesce(v_entry->>'notes','')
    ));
  end loop;

  -- Primeiro passe: trava e valida todo o estoque, sem alterar nenhum saldo.
  for v_req in
    with order_items as (
      select e.value->>'menuItemId' as menu_item_id,
             (e.value->>'quantity')::numeric as sold_qty
      from jsonb_array_elements(p_items) e(value)
    ), raw_requirements as (
      select m.simple_inventory_item_id as inventory_item_id,
             oi.sold_qty as required_qty
      from order_items oi
      join public.menu_items m on m.id = oi.menu_item_id
      where m.operational_type = 'simple'
      union all
      select mi.inventory_item_id,
             oi.sold_qty * mi.quantity as required_qty
      from order_items oi
      join public.menu_items m on m.id = oi.menu_item_id
      join public.menu_item_ingredients mi on mi.menu_item_id = m.id
      where m.operational_type = 'recipe'
    )
    select inventory_item_id, sum(required_qty) as required_qty
    from raw_requirements
    group by inventory_item_id
    order by inventory_item_id
  loop
    if v_req.inventory_item_id is null or v_req.required_qty <= 0 then
      raise exception 'Configuração de estoque inválida no pedido.';
    end if;

    select * into v_inv from public.inventory_items where id = v_req.inventory_item_id for update;
    if not found then raise exception 'Produto de estoque vinculado não encontrado.'; end if;

    if v_inv.current_stock < v_req.required_qty then
      raise exception 'Estoque integrado insuficiente para %. Necessário: % %. Disponível: % %.',
        v_inv.name, v_req.required_qty, v_inv.unit, v_inv.current_stock, v_inv.unit;
    end if;
  end loop;

  if p_destination = 'Quarto' then v_fee := 15; end if;

  -- O pedido precisa existir antes do Kardex porque stock_movements.related_order_id possui FK.
  insert into public.kitchen_orders(
    id, order_number, room_id, room_number, reservation_id, guest_name,
    items, total_amount, delivery_fee, destination, delivery_sector,
    status, special_instructions, created_at, completed_at
  ) values (
    v_order_id, v_order_number, v_room.id, v_room.number, v_res.id, v_res.guest_name,
    v_norm, v_subtotal, v_fee, p_destination, p_delivery_sector,
    'Recebido', nullif(p_special_instructions,''), v_now, null
  ) returning * into v_order;

  -- Segundo passe: baixa e gera Kardex após o pedido existir.
  for v_req in
    with order_items as (
      select e.value->>'menuItemId' as menu_item_id,
             (e.value->>'quantity')::numeric as sold_qty
      from jsonb_array_elements(p_items) e(value)
    ), raw_requirements as (
      select m.simple_inventory_item_id as inventory_item_id,
             oi.sold_qty as required_qty
      from order_items oi
      join public.menu_items m on m.id = oi.menu_item_id
      where m.operational_type = 'simple'
      union all
      select mi.inventory_item_id,
             oi.sold_qty * mi.quantity as required_qty
      from order_items oi
      join public.menu_items m on m.id = oi.menu_item_id
      join public.menu_item_ingredients mi on mi.menu_item_id = m.id
      where m.operational_type = 'recipe'
    )
    select inventory_item_id, sum(required_qty) as required_qty
    from raw_requirements
    group by inventory_item_id
    order by inventory_item_id
  loop
    select * into v_inv from public.inventory_items where id = v_req.inventory_item_id for update;
    v_prev := v_inv.current_stock;
    v_next := v_prev - v_req.required_qty;

    update public.inventory_items
    set current_stock = v_next, updated_at = v_now
    where id = v_inv.id;

    insert into public.stock_movements(
      id, timestamp, item_id, item_name, sector, type, quantity,
      previous_stock, new_stock, unit_cost, total_cost,
      related_room_number, related_reservation_id, related_order_id,
      operator, notes
    ) values (
      'mov_' || replace(gen_random_uuid()::text,'-',''),
      v_now, v_inv.id, v_inv.name, v_inv.sector, 'Saida_Venda_A_B',
      v_req.required_qty, v_prev, v_next, v_inv.cost_price,
      v_inv.cost_price * v_req.required_qty, v_room.number, v_res.id,
      v_order_id, coalesce(v_staff.full_name,'Sistema'),
      'Baixa automática por Room Service / ficha técnica'
    );
  end loop;

  insert into public.financial_transactions(
    id, type, category, description, amount, payment_method, status,
    reservation_id, room_number, guest_name, date, created_at
  ) values (
    'tx_' || replace(gen_random_uuid()::text,'-',''),
    'Receita', 'Room Service',
    format('Room Service %s - Quarto %s', v_order_number, v_room.number),
    v_subtotal + v_fee, 'Faturado', 'Pendente', v_res.id,
    v_room.number, v_res.guest_name, current_date, v_now
  );

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.create_kitchen_order_atomic(text,jsonb,text,text,text) from public;
grant execute on function public.create_kitchen_order_atomic(text,jsonb,text,text,text) to authenticated;
