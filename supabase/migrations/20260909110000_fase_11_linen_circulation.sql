-- FASE 11 — Lavanderia e Enxoval
-- Enxoval reutilizável circula sem reduzir o total físico do inventário.

create table if not exists public.linen_positions (
  id text primary key default ('linpos_' || replace(gen_random_uuid()::text, '-', '')),
  item_id text not null references public.inventory_items(id) on delete cascade,
  location_type text not null check (location_type in ('Rouparia','Quarto','Lavanderia')),
  room_number text not null default '',
  quantity numeric not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  constraint linen_positions_room_check check (
    (location_type = 'Quarto' and room_number <> '')
    or (location_type <> 'Quarto' and room_number = '')
  ),
  unique(item_id, location_type, room_number)
);

create table if not exists public.linen_movements (
  id text primary key default ('linmov_' || replace(gen_random_uuid()::text, '-', '')),
  item_id text not null references public.inventory_items(id) on delete restrict,
  item_name text not null,
  quantity numeric not null check (quantity > 0),
  from_location text not null check (from_location in ('Rouparia','Quarto','Lavanderia')),
  to_location text not null check (to_location in ('Rouparia','Quarto','Lavanderia')),
  from_room_number text,
  to_room_number text,
  operator text not null,
  moved_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_linen_positions_item on public.linen_positions(item_id);
create index if not exists idx_linen_movements_item on public.linen_movements(item_id, moved_at desc);
create index if not exists idx_linen_movements_rooms on public.linen_movements(from_room_number, to_room_number);

insert into public.linen_positions(item_id, location_type, room_number, quantity)
select i.id, 'Rouparia', '', i.current_stock
from public.inventory_items i
where i.category = 'Enxoval & Rouparia'
on conflict (item_id, location_type, room_number) do nothing;

alter table public.linen_positions enable row level security;
alter table public.linen_movements enable row level security;

revoke all on public.linen_positions from anon;
revoke all on public.linen_movements from anon;
grant select on public.linen_positions to authenticated;
grant select on public.linen_movements to authenticated;

drop policy if exists linen_positions_authenticated_read on public.linen_positions;
create policy linen_positions_authenticated_read
  on public.linen_positions for select to authenticated using (true);

drop policy if exists linen_movements_authenticated_read on public.linen_movements;
create policy linen_movements_authenticated_read
  on public.linen_movements for select to authenticated using (true);

create or replace function public.move_linen_atomic(
  p_item_id text,
  p_from_location text,
  p_to_location text,
  p_quantity numeric,
  p_from_room text default null,
  p_to_room text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_item public.inventory_items%rowtype;
  v_source public.linen_positions%rowtype;
  v_from_room text := coalesce(trim(p_from_room), '');
  v_to_room text := coalesce(trim(p_to_room), '');
  v_operator text;
  v_now timestamptz := now();
  v_total numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (v_staff.role = 'admin' or v_staff.permissions ? 'manage_inventory') then
    raise exception 'Permissão insuficiente para movimentar enxoval.';
  end if;

  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantidade inválida.'; end if;
  if p_from_location not in ('Rouparia','Quarto','Lavanderia') or p_to_location not in ('Rouparia','Quarto','Lavanderia') then
    raise exception 'Local de enxoval inválido.';
  end if;
  if p_from_location = p_to_location and v_from_room = v_to_room then raise exception 'Origem e destino não podem ser iguais.'; end if;

  if not (
    (p_from_location = 'Rouparia' and p_to_location = 'Quarto')
    or (p_from_location = 'Quarto' and p_to_location = 'Lavanderia')
    or (p_from_location = 'Lavanderia' and p_to_location = 'Rouparia')
  ) then
    raise exception 'Fluxo inválido. Use Rouparia → Quarto → Lavanderia → Rouparia.';
  end if;

  if p_from_location = 'Quarto' and v_from_room = '' then raise exception 'Informe o quarto de origem.'; end if;
  if p_from_location <> 'Quarto' then v_from_room := ''; end if;
  if p_to_location = 'Quarto' and v_to_room = '' then raise exception 'Informe o quarto de destino.'; end if;
  if p_to_location <> 'Quarto' then v_to_room := ''; end if;

  select * into v_item from public.inventory_items where id = p_item_id for update;
  if not found then raise exception 'Item de enxoval não encontrado.'; end if;
  if v_item.category <> 'Enxoval & Rouparia' then raise exception 'O item % não é enxoval reutilizável.', v_item.name; end if;

  select * into v_source
  from public.linen_positions
  where item_id = p_item_id and location_type = p_from_location and room_number = v_from_room
  for update;

  if not found or v_source.quantity < p_quantity then
    raise exception 'Quantidade insuficiente em %. Disponível: % %.',
      case when p_from_location='Quarto' then 'Quarto '||v_from_room else p_from_location end,
      coalesce(v_source.quantity,0), v_item.unit;
  end if;

  update public.linen_positions
  set quantity = quantity - p_quantity, updated_at = v_now
  where id = v_source.id;

  insert into public.linen_positions(item_id, location_type, room_number, quantity, updated_at)
  values (p_item_id, p_to_location, v_to_room, p_quantity, v_now)
  on conflict (item_id, location_type, room_number)
  do update set quantity = public.linen_positions.quantity + excluded.quantity, updated_at = excluded.updated_at;

  v_operator := coalesce(nullif(trim(v_staff.full_name),''), 'Sistema');

  insert into public.linen_movements(
    item_id,item_name,quantity,from_location,to_location,
    from_room_number,to_room_number,operator,moved_at,notes
  ) values (
    v_item.id,v_item.name,p_quantity,p_from_location,p_to_location,
    nullif(v_from_room,''),nullif(v_to_room,''),v_operator,v_now,nullif(trim(p_notes),'')
  );

  select coalesce(sum(quantity),0) into v_total from public.linen_positions where item_id = p_item_id;
  if v_total <> v_item.current_stock then
    raise exception 'Integridade do enxoval violada: posições somam %, total físico é %.', v_total, v_item.current_stock;
  end if;

  return jsonb_build_object(
    'itemId', v_item.id,
    'itemName', v_item.name,
    'quantity', p_quantity,
    'fromLocation', p_from_location,
    'toLocation', p_to_location,
    'fromRoom', nullif(v_from_room,''),
    'toRoom', nullif(v_to_room,''),
    'physicalTotal', v_item.current_stock,
    'positionsTotal', v_total,
    'operator', v_operator,
    'movedAt', v_now
  );
end;
$$;

revoke all on function public.move_linen_atomic(text,text,text,numeric,text,text,text) from public;
revoke all on function public.move_linen_atomic(text,text,text,numeric,text,text,text) from anon;
grant execute on function public.move_linen_atomic(text,text,text,numeric,text,text,text) to authenticated;
