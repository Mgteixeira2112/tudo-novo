-- Bloco A — cardápio operacional, produto simples/receita composta e ficha técnica

alter table public.menu_items
  add column if not exists operational_type text not null default 'simple',
  add column if not exists simple_inventory_item_id text null;

alter table public.menu_items
  drop constraint if exists menu_items_operational_type_check;
alter table public.menu_items
  add constraint menu_items_operational_type_check
  check (operational_type in ('simple','recipe'));

alter table public.menu_items
  drop constraint if exists menu_items_simple_inventory_item_id_fkey;
alter table public.menu_items
  add constraint menu_items_simple_inventory_item_id_fkey
  foreign key (simple_inventory_item_id) references public.inventory_items(id) on delete restrict;

create unique index if not exists ux_inventory_items_linked_menu_item_id
  on public.inventory_items(linked_menu_item_id)
  where linked_menu_item_id is not null;

update public.menu_items m
set simple_inventory_item_id = i.id,
    operational_type = 'simple'
from public.inventory_items i
where i.linked_menu_item_id = m.id
  and m.simple_inventory_item_id is null;

create table if not exists public.menu_item_ingredients (
  id text primary key,
  menu_item_id text not null references public.menu_items(id) on delete cascade,
  inventory_item_id text not null references public.inventory_items(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_item_id, inventory_item_id)
);

create index if not exists idx_menu_item_ingredients_menu_item
  on public.menu_item_ingredients(menu_item_id);
create index if not exists idx_menu_item_ingredients_inventory_item
  on public.menu_item_ingredients(inventory_item_id);

alter table public.menu_item_ingredients enable row level security;

drop policy if exists menu_item_ingredients_staff_read on public.menu_item_ingredients;
create policy menu_item_ingredients_staff_read
on public.menu_item_ingredients for select
to authenticated
using (
  exists (
    select 1 from public.staff_users s
    where s.id = auth.uid() and s.active = true
  )
);

create or replace function public.menu_admin_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (
    v_staff.role = 'admin' or
    v_staff.permissions ? 'manage_menu' or
    v_staff.permissions ? 'manage_fnb'
  ) then
    raise exception 'Permissão insuficiente para administrar o cardápio.';
  end if;

  select coalesce(jsonb_agg(row_data order by row_data->>'category', row_data->>'name'),'[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', m.id,
      'name', m.name,
      'category', m.category,
      'price', m.price,
      'description', coalesce(m.description,''),
      'prepTimeMinutes', m.prep_time_minutes,
      'available', m.available,
      'operationalType', m.operational_type,
      'simpleInventoryItemId', m.simple_inventory_item_id,
      'simpleInventoryItem', case when si.id is null then null else jsonb_build_object(
        'id', si.id, 'name', si.name, 'sku', si.sku, 'unit', si.unit,
        'currentStock', si.current_stock, 'minStock', si.min_stock,
        'costPrice', si.cost_price, 'sector', si.sector, 'category', si.category
      ) end,
      'ingredients', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', mi.id,
          'inventoryItemId', i.id,
          'name', i.name,
          'sku', i.sku,
          'quantity', mi.quantity,
          'unit', i.unit,
          'currentStock', i.current_stock,
          'minStock', i.min_stock,
          'costPrice', i.cost_price,
          'proportionalCost', mi.quantity * i.cost_price
        ) order by i.name)
        from public.menu_item_ingredients mi
        join public.inventory_items i on i.id = mi.inventory_item_id
        where mi.menu_item_id = m.id
      ), '[]'::jsonb)
    ) as row_data
    from public.menu_items m
    left join public.inventory_items si on si.id = m.simple_inventory_item_id
  ) q;
  return v_result;
end;
$$;

create or replace function public.save_menu_item_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_id text;
  v_name text;
  v_category text;
  v_price numeric;
  v_description text;
  v_prep integer;
  v_available boolean;
  v_type text;
  v_simple_id text;
  v_new_inventory jsonb;
  v_ing jsonb;
  v_inv public.inventory_items%rowtype;
  v_qty numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (
    v_staff.role = 'admin' or
    v_staff.permissions ? 'manage_menu' or
    v_staff.permissions ? 'manage_fnb'
  ) then
    raise exception 'Permissão insuficiente para administrar o cardápio.';
  end if;

  v_id := nullif(p_payload->>'id','');
  v_name := trim(coalesce(p_payload->>'name',''));
  v_category := trim(coalesce(p_payload->>'category',''));
  v_price := coalesce((p_payload->>'price')::numeric,0);
  v_description := coalesce(p_payload->>'description','');
  v_prep := greatest(coalesce((p_payload->>'prepTimeMinutes')::integer,20),0);
  v_available := coalesce((p_payload->>'available')::boolean,true);
  v_type := coalesce(nullif(p_payload->>'operationalType',''),'simple');
  v_simple_id := nullif(p_payload->>'simpleInventoryItemId','');
  v_new_inventory := p_payload->'newInventoryItem';

  if v_name = '' or v_category = '' then raise exception 'Nome e categoria são obrigatórios.'; end if;
  if v_price < 0 then raise exception 'Preço inválido.'; end if;
  if v_type not in ('simple','recipe') then raise exception 'Tipo operacional inválido.'; end if;

  if v_id is null then v_id := 'menu_' || replace(gen_random_uuid()::text,'-',''); end if;

  if v_type = 'simple' then
    if v_simple_id is null and v_new_inventory is not null then
      if trim(coalesce(v_new_inventory->>'name','')) = '' then raise exception 'Nome do produto de estoque é obrigatório.'; end if;
      v_simple_id := 'inv_' || replace(gen_random_uuid()::text,'-','');
      insert into public.inventory_items(
        id, sku, name, sector, category, current_stock, min_stock, max_stock, unit,
        cost_price, selling_price, supplier, linked_menu_item_id, updated_at
      ) values (
        v_simple_id,
        coalesce(nullif(v_new_inventory->>'sku',''),'SKU-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
        trim(v_new_inventory->>'name'),
        coalesce(nullif(v_new_inventory->>'sector',''),'Alimentos_Bebidas'),
        coalesce(nullif(v_new_inventory->>'category',''),'Alimentos & Bebidas'),
        greatest(coalesce((v_new_inventory->>'currentStock')::numeric,0),0),
        greatest(coalesce((v_new_inventory->>'minStock')::numeric,0),0),
        nullif(v_new_inventory->>'maxStock','')::numeric,
        coalesce(nullif(v_new_inventory->>'unit',''),'un'),
        greatest(coalesce((v_new_inventory->>'costPrice')::numeric,0),0),
        null,
        nullif(v_new_inventory->>'supplier',''),
        v_id,
        now()
      );
    end if;
    if v_simple_id is null then raise exception 'Produto simples exige vínculo com o estoque.'; end if;
    select * into v_inv from public.inventory_items where id=v_simple_id for update;
    if not found then raise exception 'Produto de estoque vinculado não encontrado.'; end if;
    if v_inv.linked_menu_item_id is not null and v_inv.linked_menu_item_id <> v_id then
      raise exception 'Este item de estoque já está vinculado a outro item do cardápio.';
    end if;
  end if;

  insert into public.menu_items(id,name,category,price,description,prep_time_minutes,available,operational_type,simple_inventory_item_id)
  values(v_id,v_name,v_category,v_price,v_description,v_prep,v_available,v_type,case when v_type='simple' then v_simple_id else null end)
  on conflict (id) do update set
    name=excluded.name, category=excluded.category, price=excluded.price,
    description=excluded.description, prep_time_minutes=excluded.prep_time_minutes,
    available=excluded.available, operational_type=excluded.operational_type,
    simple_inventory_item_id=excluded.simple_inventory_item_id;

  update public.inventory_items set linked_menu_item_id=null, updated_at=now()
  where linked_menu_item_id=v_id and (v_type='recipe' or id<>v_simple_id);

  if v_type='simple' then
    update public.inventory_items set linked_menu_item_id=v_id, updated_at=now() where id=v_simple_id;
    delete from public.menu_item_ingredients where menu_item_id=v_id;
  else
    delete from public.menu_item_ingredients where menu_item_id=v_id;
    for v_ing in select value from jsonb_array_elements(coalesce(p_payload->'ingredients','[]'::jsonb))
    loop
      v_simple_id := nullif(v_ing->>'inventoryItemId','');
      v_qty := coalesce((v_ing->>'quantity')::numeric,0);
      if v_simple_id is null or v_qty <= 0 then raise exception 'Ingrediente ou quantidade inválida.'; end if;
      select * into v_inv from public.inventory_items where id=v_simple_id;
      if not found then raise exception 'Ingrediente de estoque não encontrado.'; end if;
      insert into public.menu_item_ingredients(id,menu_item_id,inventory_item_id,quantity)
      values('ming_'||replace(gen_random_uuid()::text,'-',''),v_id,v_simple_id,v_qty);
    end loop;
    if not exists(select 1 from public.menu_item_ingredients where menu_item_id=v_id) then
      raise exception 'Receita composta exige ao menos um ingrediente.';
    end if;
  end if;

  return (
    select value from jsonb_array_elements(public.menu_admin_snapshot()) value
    where value->>'id'=v_id limit 1
  );
end;
$$;

create or replace function public.set_menu_item_availability(p_menu_item_id text, p_available boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_staff from public.staff_users where id=auth.uid() and active=true;
  if not found or not (v_staff.role='admin' or v_staff.permissions ? 'manage_menu' or v_staff.permissions ? 'manage_fnb') then
    raise exception 'Permissão insuficiente para administrar o cardápio.';
  end if;
  update public.menu_items set available=p_available where id=p_menu_item_id;
  if not found then raise exception 'Item do cardápio não encontrado.'; end if;
  return (
    select value from jsonb_array_elements(public.menu_admin_snapshot()) value
    where value->>'id'=p_menu_item_id limit 1
  );
end;
$$;

revoke all on function public.menu_admin_snapshot() from public;
revoke all on function public.save_menu_item_atomic(jsonb) from public;
revoke all on function public.set_menu_item_availability(text,boolean) from public;
grant execute on function public.menu_admin_snapshot() to authenticated;
grant execute on function public.save_menu_item_atomic(jsonb) to authenticated;
grant execute on function public.set_menu_item_availability(text,boolean) to authenticated;
