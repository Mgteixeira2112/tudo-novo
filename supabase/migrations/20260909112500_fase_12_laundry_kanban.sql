-- FASE 12 — Kanban da Lavanderia
-- Reutiliza kanban_tasks como motor de estado e mantém a circulação física do enxoval.

create table if not exists public.laundry_batches (
  id text primary key default ('laundry_' || replace(gen_random_uuid()::text, '-', '')),
  task_id text not null unique references public.kanban_tasks(id) on delete cascade,
  room_number text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  returned_at timestamptz,
  notes text
);

create table if not exists public.laundry_batch_items (
  id text primary key default ('laundryitem_' || replace(gen_random_uuid()::text, '-', '')),
  batch_id text not null references public.laundry_batches(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete restrict,
  item_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  unique(batch_id, item_id)
);

create index if not exists idx_laundry_batches_task on public.laundry_batches(task_id);
create index if not exists idx_laundry_batches_room on public.laundry_batches(room_number, created_at desc);
create index if not exists idx_laundry_batch_items_batch on public.laundry_batch_items(batch_id);

alter table public.laundry_batches enable row level security;
alter table public.laundry_batch_items enable row level security;

revoke all on public.laundry_batches from anon;
revoke all on public.laundry_batch_items from anon;
grant select on public.laundry_batches to authenticated;
grant select on public.laundry_batch_items to authenticated;

drop policy if exists laundry_batches_authenticated_read on public.laundry_batches;
create policy laundry_batches_authenticated_read
  on public.laundry_batches for select to authenticated using (true);

drop policy if exists laundry_batch_items_authenticated_read on public.laundry_batch_items;
create policy laundry_batch_items_authenticated_read
  on public.laundry_batch_items for select to authenticated using (true);

create or replace function public.create_laundry_batch_atomic(
  p_room_number text,
  p_items jsonb,
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
  v_entry jsonb;
  v_quantity numeric;
  v_room text := trim(coalesce(p_room_number, ''));
  v_batch_id text := 'laundry_' || replace(gen_random_uuid()::text, '-', '');
  v_task_id text := 'task_' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text || '_' || floor(random() * 10000)::int::text;
  v_operator text;
  v_now timestamptz := now();
  v_total numeric;
  v_description text := '';
  v_item_count integer;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (
    v_staff.role = 'admin'
    or (
      v_staff.permissions ? 'manage_inventory'
      and v_staff.permissions ? 'manage_all_kanbans'
    )
  ) then
    raise exception 'Permissão insuficiente para criar lote de lavanderia.';
  end if;

  if v_room = '' then raise exception 'Informe o quarto de origem.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe pelo menos um item de enxoval.';
  end if;

  select count(*), count(distinct value->>'inventoryItemId')
  into v_item_count, v_quantity
  from jsonb_array_elements(p_items);

  if v_item_count <> v_quantity then
    raise exception 'O mesmo item não pode ser informado duas vezes no lote.';
  end if;

  v_operator := coalesce(nullif(trim(v_staff.full_name), ''), 'Sistema');

  -- Primeira passagem: trava e valida todo o lote antes de qualquer alteração.
  for v_entry in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_entry->>'inventoryItemId', '') = '' then
      raise exception 'Item de enxoval inválido.';
    end if;

    v_quantity := nullif(v_entry->>'quantity', '')::numeric;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida no lote.';
    end if;

    select * into v_item
    from public.inventory_items
    where id = v_entry->>'inventoryItemId'
    for update;

    if not found or v_item.category <> 'Enxoval & Rouparia' then
      raise exception 'Item de enxoval não encontrado: %.', v_entry->>'inventoryItemId';
    end if;

    select * into v_source
    from public.linen_positions
    where item_id = v_item.id
      and location_type = 'Quarto'
      and room_number = v_room
    for update;

    if not found or v_source.quantity < v_quantity then
      raise exception 'Quantidade insuficiente no Quarto % para %. Necessário: % %. Disponível: % %.',
        v_room, v_item.name, v_quantity, v_item.unit, coalesce(v_source.quantity, 0), v_item.unit;
    end if;
  end loop;

  insert into public.kanban_tasks(
    id, title, description, sector, status, priority,
    room_number, related_type, related_id, created_at, updated_at
  ) values (
    v_task_id,
    'Quarto ' || v_room || ' — Lote de Lavanderia',
    'Lote de enxoval recolhido do Quarto ' || v_room,
    'Lavanderia',
    'A_Fazer',
    'Media',
    v_room,
    'Lavanderia',
    v_batch_id,
    v_now,
    v_now
  );

  insert into public.laundry_batches(id, task_id, room_number, created_by, created_at, notes)
  values (v_batch_id, v_task_id, v_room, v_operator, v_now, nullif(trim(p_notes), ''));

  -- Segunda passagem: move o lote para Lavanderia e registra os itens.
  for v_entry in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_entry->>'quantity')::numeric;

    select * into v_item
    from public.inventory_items
    where id = v_entry->>'inventoryItemId'
    for update;

    select * into v_source
    from public.linen_positions
    where item_id = v_item.id
      and location_type = 'Quarto'
      and room_number = v_room
    for update;

    update public.linen_positions
    set quantity = quantity - v_quantity, updated_at = v_now
    where id = v_source.id;

    insert into public.linen_positions(item_id, location_type, room_number, quantity, updated_at)
    values (v_item.id, 'Lavanderia', '', v_quantity, v_now)
    on conflict (item_id, location_type, room_number)
    do update set quantity = public.linen_positions.quantity + excluded.quantity,
                  updated_at = excluded.updated_at;

    insert into public.laundry_batch_items(batch_id, item_id, item_name, quantity, unit)
    values (v_batch_id, v_item.id, v_item.name, v_quantity, v_item.unit);

    insert into public.linen_movements(
      item_id, item_name, quantity, from_location, to_location,
      from_room_number, to_room_number, operator, moved_at, notes
    ) values (
      v_item.id, v_item.name, v_quantity, 'Quarto', 'Lavanderia',
      v_room, null, v_operator, v_now,
      'Entrada no lote de lavanderia ' || v_batch_id
    );

    select coalesce(sum(quantity), 0)
    into v_total
    from public.linen_positions
    where item_id = v_item.id;

    if v_total <> v_item.current_stock then
      raise exception 'Integridade do enxoval violada para %: posições somam %, total físico é %.',
        v_item.name, v_total, v_item.current_stock;
    end if;

    v_description := v_description ||
      case when v_description = '' then '' else E'\n' end ||
      trim(to_char(v_quantity, 'FM999999990.##')) || ' ' || v_item.unit || ' — ' || v_item.name;
  end loop;

  update public.kanban_tasks
  set description = v_description,
      updated_at = v_now
  where id = v_task_id;

  return jsonb_build_object(
    'batchId', v_batch_id,
    'taskId', v_task_id,
    'roomNumber', v_room,
    'status', 'A_Fazer',
    'createdBy', v_operator,
    'createdAt', v_now
  );
end;
$$;

create or replace function public.advance_laundry_batch_atomic(
  p_batch_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_batch public.laundry_batches%rowtype;
  v_task public.kanban_tasks%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (
    v_staff.role = 'admin'
    or v_staff.permissions ? 'manage_all_kanbans'
  ) then
    raise exception 'Permissão insuficiente para operar o Kanban da Lavanderia.';
  end if;

  select * into v_batch
  from public.laundry_batches
  where id = p_batch_id
  for update;

  if not found then raise exception 'Lote de lavanderia não encontrado.'; end if;

  select * into v_task
  from public.kanban_tasks
  where id = v_batch.task_id
  for update;

  if not found or v_task.sector <> 'Lavanderia' then
    raise exception 'Tarefa de lavanderia inválida.';
  end if;

  if v_task.status = 'A_Fazer' then
    update public.kanban_tasks
    set status = 'Em_Andamento', updated_at = v_now
    where id = v_task.id;

    update public.laundry_batches
    set started_at = coalesce(started_at, v_now)
    where id = v_batch.id;

    return jsonb_build_object('batchId', v_batch.id, 'taskId', v_task.id, 'status', 'Em_Andamento');
  end if;

  if v_task.status = 'Em_Andamento' then
    update public.kanban_tasks
    set status = 'Concluido', completed_at = v_now, updated_at = v_now
    where id = v_task.id;

    update public.laundry_batches
    set ready_at = coalesce(ready_at, v_now)
    where id = v_batch.id;

    return jsonb_build_object('batchId', v_batch.id, 'taskId', v_task.id, 'status', 'Concluido');
  end if;

  raise exception 'O lote já está marcado como Pronto.';
end;
$$;

create or replace function public.return_laundry_batch_atomic(
  p_batch_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_batch public.laundry_batches%rowtype;
  v_task public.kanban_tasks%rowtype;
  v_batch_item public.laundry_batch_items%rowtype;
  v_item public.inventory_items%rowtype;
  v_source public.linen_positions%rowtype;
  v_now timestamptz := now();
  v_operator text;
  v_total numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (
    v_staff.role = 'admin'
    or (
      v_staff.permissions ? 'manage_inventory'
      and v_staff.permissions ? 'manage_all_kanbans'
    )
  ) then
    raise exception 'Permissão insuficiente para retornar lote à Rouparia.';
  end if;

  select * into v_batch
  from public.laundry_batches
  where id = p_batch_id
  for update;

  if not found then raise exception 'Lote de lavanderia não encontrado.'; end if;
  if v_batch.returned_at is not null then raise exception 'Este lote já retornou à Rouparia.'; end if;

  select * into v_task
  from public.kanban_tasks
  where id = v_batch.task_id
  for update;

  if not found or v_task.status <> 'Concluido' then
    raise exception 'O lote precisa estar Pronto antes de retornar à Rouparia.';
  end if;

  v_operator := coalesce(nullif(trim(v_staff.full_name), ''), 'Sistema');

  -- Validação completa antes de qualquer retorno.
  for v_batch_item in
    select * from public.laundry_batch_items where batch_id = v_batch.id order by id
  loop
    select * into v_item from public.inventory_items where id = v_batch_item.item_id for update;

    select * into v_source
    from public.linen_positions
    where item_id = v_batch_item.item_id
      and location_type = 'Lavanderia'
      and room_number = ''
    for update;

    if not found or v_source.quantity < v_batch_item.quantity then
      raise exception 'Quantidade insuficiente na Lavanderia para %. Necessário: % %. Disponível: % %.',
        v_batch_item.item_name, v_batch_item.quantity, v_batch_item.unit,
        coalesce(v_source.quantity, 0), v_batch_item.unit;
    end if;
  end loop;

  for v_batch_item in
    select * from public.laundry_batch_items where batch_id = v_batch.id order by id
  loop
    select * into v_item from public.inventory_items where id = v_batch_item.item_id for update;

    select * into v_source
    from public.linen_positions
    where item_id = v_batch_item.item_id
      and location_type = 'Lavanderia'
      and room_number = ''
    for update;

    update public.linen_positions
    set quantity = quantity - v_batch_item.quantity, updated_at = v_now
    where id = v_source.id;

    insert into public.linen_positions(item_id, location_type, room_number, quantity, updated_at)
    values (v_batch_item.item_id, 'Rouparia', '', v_batch_item.quantity, v_now)
    on conflict (item_id, location_type, room_number)
    do update set quantity = public.linen_positions.quantity + excluded.quantity,
                  updated_at = excluded.updated_at;

    insert into public.linen_movements(
      item_id, item_name, quantity, from_location, to_location,
      from_room_number, to_room_number, operator, moved_at, notes
    ) values (
      v_batch_item.item_id, v_batch_item.item_name, v_batch_item.quantity,
      'Lavanderia', 'Rouparia', null, null, v_operator, v_now,
      'Retorno do lote de lavanderia ' || v_batch.id || ' à Rouparia'
    );

    select coalesce(sum(quantity), 0)
    into v_total
    from public.linen_positions
    where item_id = v_batch_item.item_id;

    if v_total <> v_item.current_stock then
      raise exception 'Integridade do enxoval violada para %: posições somam %, total físico é %.',
        v_item.name, v_total, v_item.current_stock;
    end if;
  end loop;

  update public.laundry_batches
  set returned_at = v_now
  where id = v_batch.id;

  return jsonb_build_object(
    'batchId', v_batch.id,
    'taskId', v_task.id,
    'status', 'Concluido',
    'returnedAt', v_now,
    'operator', v_operator
  );
end;
$$;

revoke all on function public.create_laundry_batch_atomic(text,jsonb,text) from public;
revoke all on function public.create_laundry_batch_atomic(text,jsonb,text) from anon;
grant execute on function public.create_laundry_batch_atomic(text,jsonb,text) to authenticated;

revoke all on function public.advance_laundry_batch_atomic(text) from public;
revoke all on function public.advance_laundry_batch_atomic(text) from anon;
grant execute on function public.advance_laundry_batch_atomic(text) to authenticated;

revoke all on function public.return_laundry_batch_atomic(text) from public;
revoke all on function public.return_laundry_batch_atomic(text) from anon;
grant execute on function public.return_laundry_batch_atomic(text) to authenticated;
