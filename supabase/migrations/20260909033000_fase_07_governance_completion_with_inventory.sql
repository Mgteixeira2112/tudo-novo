alter table public.stock_movements
  add column if not exists related_task_id text;

create index if not exists idx_stock_movements_related_task_id
  on public.stock_movements(related_task_id)
  where related_task_id is not null;

create or replace function public.complete_governance_task_atomic(
  p_task_id text,
  p_materials jsonb default '[]'::jsonb,
  p_operator text default null
)
returns public.kanban_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_task public.kanban_tasks%rowtype;
  v_item public.inventory_items%rowtype;
  v_material jsonb;
  v_quantity numeric;
  v_previous numeric;
  v_next numeric;
  v_now timestamptz := now();
  v_operator text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

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
    raise exception 'Permissão insuficiente para concluir tarefa de Governança com consumo.';
  end if;

  select * into v_task
  from public.kanban_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Tarefa não encontrada.';
  end if;

  if v_task.sector <> 'Governanca' then
    raise exception 'Esta operação é exclusiva para tarefas de Governança.';
  end if;

  if v_task.status <> 'Em_Andamento' then
    raise exception 'A tarefa precisa estar Em Andamento para ser concluída.';
  end if;

  if p_materials is null or jsonb_typeof(p_materials) <> 'array' then
    raise exception 'Lista de materiais inválida.';
  end if;

  v_operator := coalesce(nullif(trim(p_operator), ''), nullif(trim(v_staff.full_name), ''), 'Sistema');

  -- Primeira passagem: trava e valida todos os itens antes de qualquer baixa.
  for v_material in select value from jsonb_array_elements(p_materials)
  loop
    if coalesce(v_material->>'inventoryItemId', '') = '' then
      raise exception 'Material sem item de estoque.';
    end if;

    v_quantity := nullif(v_material->>'quantity', '')::numeric;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida para material.';
    end if;

    select * into v_item
    from public.inventory_items
    where id = v_material->>'inventoryItemId'
    for update;

    if not found then
      raise exception 'Item de estoque não encontrado: %.', v_material->>'inventoryItemId';
    end if;

    if v_item.sector <> 'Governanca_Enxoval' then
      raise exception 'O item % não pertence ao estoque de Governança.', v_item.name;
    end if;

    if v_item.current_stock < v_quantity then
      raise exception 'Estoque insuficiente para %. Necessário: % %. Disponível: % %.',
        v_item.name, v_quantity, v_item.unit, v_item.current_stock, v_item.unit;
    end if;
  end loop;

  -- Segunda passagem: aplica as baixas e registra Kardex vinculado à tarefa.
  for v_material in select value from jsonb_array_elements(p_materials)
  loop
    v_quantity := (v_material->>'quantity')::numeric;

    select * into v_item
    from public.inventory_items
    where id = v_material->>'inventoryItemId'
    for update;

    v_previous := v_item.current_stock;
    v_next := v_previous - v_quantity;

    update public.inventory_items
    set current_stock = v_next,
        updated_at = v_now
    where id = v_item.id;

    insert into public.stock_movements(
      id, timestamp, item_id, item_name, sector, type, quantity,
      previous_stock, new_stock, unit_cost, total_cost,
      related_room_number, related_task_id, operator, notes
    ) values (
      'mov_' || replace(gen_random_uuid()::text, '-', ''),
      v_now,
      v_item.id,
      v_item.name,
      v_item.sector,
      'Saida_Consumo_Interno',
      v_quantity,
      v_previous,
      v_next,
      coalesce(v_item.cost_price, 0),
      coalesce(v_item.cost_price, 0) * v_quantity,
      v_task.room_number,
      v_task.id,
      v_operator,
      'Consumo de material na conclusão de tarefa de Governança'
    );
  end loop;

  update public.kanban_tasks
  set status = 'Concluido',
      completed_at = v_now,
      updated_at = v_now
  where id = v_task.id
  returning * into v_task;

  return v_task;
end;
$$;

revoke all on function public.complete_governance_task_atomic(text, jsonb, text) from public;
revoke all on function public.complete_governance_task_atomic(text, jsonb, text) from anon;
grant execute on function public.complete_governance_task_atomic(text, jsonb, text) to authenticated;
