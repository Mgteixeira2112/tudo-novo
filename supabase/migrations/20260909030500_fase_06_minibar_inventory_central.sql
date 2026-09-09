create unique index if not exists inventory_items_linked_minibar_item_id_uidx
  on public.inventory_items(linked_minibar_item_id)
  where linked_minibar_item_id is not null;

insert into public.inventory_items(
  id, sku, name, sector, category, current_stock, min_stock, max_stock,
  unit, cost_price, selling_price, supplier, location_barcode,
  linked_minibar_item_id, linked_menu_item_id, updated_at
)
select
  'inv_minibar_' || replace(m.id, 'mb_', ''),
  'MB-' || upper(replace(m.id, 'mb_', '')),
  m.name,
  'Frigobar',
  m.category,
  m.stock_qty,
  0,
  null,
  m.unit,
  0,
  m.price,
  null,
  null,
  m.id,
  null,
  now()
from public.minibar_items m
where not exists (
  select 1
  from public.inventory_items i
  where i.linked_minibar_item_id = m.id
);

update public.minibar_items m
set stock_qty = i.current_stock::integer
from public.inventory_items i
where i.linked_minibar_item_id = m.id
  and m.stock_qty is distinct from i.current_stock::integer;

create or replace function public.register_minibar_consumption_atomic(
  p_room_id text,
  p_item_id text,
  p_quantity integer,
  p_registered_by text default 'Sistema'
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
  v_item public.minibar_items%rowtype;
  v_inv public.inventory_items%rowtype;
  v_cons public.room_consumptions%rowtype;
  v_now timestamptz := now();
  v_total numeric;
  v_prev numeric;
  v_next numeric;
  v_tx_id text := 'tx_' || replace(gen_random_uuid()::text,'-','');
  v_mov_id text := 'mov_' || replace(gen_random_uuid()::text,'-','');
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (
    v_staff.role = 'admin'
    or v_staff.permissions ? 'manage_fnb'
    or v_staff.permissions ? 'manage_inventory'
  ) then
    raise exception 'Permissão insuficiente para lançar consumo de frigobar.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade inválida.';
  end if;

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then raise exception 'Quarto não encontrado.'; end if;
  if v_room.status <> 'Ocupado' or v_room.current_reservation_id is null then
    raise exception 'O quarto precisa estar ocupado por uma reserva ativa.';
  end if;

  select * into v_res
  from public.reservations
  where id = v_room.current_reservation_id
  for update;

  if not found or v_res.status <> 'CheckIn' or v_res.room_id <> v_room.id then
    raise exception 'Reserva ativa do quarto não encontrada.';
  end if;

  select * into v_item
  from public.minibar_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item do frigobar não encontrado.';
  end if;

  select * into v_inv
  from public.inventory_items
  where linked_minibar_item_id = v_item.id
  for update;

  if not found then
    raise exception 'Item do frigobar sem vínculo com inventário central.';
  end if;

  if v_inv.current_stock < p_quantity then
    raise exception 'Estoque integrado insuficiente para %. Necessário: % %. Disponível: % %.',
      v_inv.name, p_quantity, v_inv.unit, v_inv.current_stock, v_inv.unit;
  end if;

  v_total := v_item.price * p_quantity;
  v_prev := v_inv.current_stock;
  v_next := v_prev - p_quantity;

  update public.inventory_items
  set current_stock = v_next,
      updated_at = v_now
  where id = v_inv.id;

  update public.minibar_items
  set stock_qty = v_next::integer
  where id = v_item.id;

  insert into public.room_consumptions(
    id, room_id, room_number, reservation_id, guest_name,
    item_id, item_name, quantity, unit_price, total_price,
    registered_by, registered_at, status
  ) values (
    'cons_' || replace(gen_random_uuid()::text,'-',''),
    v_room.id,
    v_room.number,
    v_res.id,
    v_res.guest_name,
    v_item.id,
    v_item.name,
    p_quantity,
    v_item.price,
    v_total,
    coalesce(nullif(p_registered_by,''), v_staff.full_name, 'Sistema'),
    v_now,
    'Lançado'
  ) returning * into v_cons;

  insert into public.financial_transactions(
    id, type, category, description, amount, payment_method, status,
    reservation_id, room_number, guest_name, date, created_at
  ) values (
    v_tx_id,
    'Receita',
    'Frigobar',
    format('Consumo Frigobar: %sx %s - Quarto %s', p_quantity, v_item.name, v_room.number),
    v_total,
    'Faturado',
    'Pendente',
    v_res.id,
    v_room.number,
    v_res.guest_name,
    current_date,
    v_now
  );

  insert into public.stock_movements(
    id, timestamp, item_id, item_name, sector, type, quantity,
    previous_stock, new_stock, unit_cost, total_cost,
    related_room_number, related_reservation_id, operator, notes
  ) values (
    v_mov_id,
    v_now,
    v_inv.id,
    v_inv.name,
    v_inv.sector,
    'Saida_Consumo_Quarto',
    p_quantity,
    v_prev,
    v_next,
    v_inv.cost_price,
    v_inv.cost_price * p_quantity,
    v_room.number,
    v_res.id,
    coalesce(nullif(p_registered_by,''), v_staff.full_name, 'Sistema'),
    'Consumo de frigobar integrado ao inventário central'
  );

  return to_jsonb(v_cons);
end;
$$;

revoke all on function public.register_minibar_consumption_atomic(text,text,integer,text) from public;
grant execute on function public.register_minibar_consumption_atomic(text,text,integer,text) to authenticated;
