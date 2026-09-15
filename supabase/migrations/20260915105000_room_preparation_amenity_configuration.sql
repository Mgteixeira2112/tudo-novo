create or replace function public.save_room_amenity_kit_atomic(
  p_room_type_id text,
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
  v_kit public.room_amenity_kits%rowtype;
  v_item jsonb;
  v_inventory public.inventory_items%rowtype;
  v_quantity numeric;
  v_room_type_exists boolean := false;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (
    v_staff.role = 'admin'
    or v_staff.permissions ? 'manage_inventory'
  ) then
    raise exception 'Permissão insuficiente para configurar o padrão de amenities.';
  end if;

  if coalesce(trim(p_room_type_id), '') = '' then
    raise exception 'Tipo de quarto obrigatório.';
  end if;

  select exists (
    select 1
    from public.hotel_settings hs,
         jsonb_array_elements(coalesce(hs.room_types, '[]'::jsonb)) room_type
    where room_type->>'id' = p_room_type_id
  ) into v_room_type_exists;

  if not v_room_type_exists then
    raise exception 'Tipo de quarto não encontrado nas configurações do hotel.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Lista de amenities inválida.';
  end if;

  if exists (
    select 1
    from (
      select value->>'inventoryItemId' as inventory_item_id, count(*)
      from jsonb_array_elements(p_items)
      group by value->>'inventoryItemId'
      having count(*) > 1
    ) duplicated
  ) then
    raise exception 'A lista possui amenities duplicados.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'inventoryItemId', '') = '' then
      raise exception 'Amenity sem item de estoque.';
    end if;

    v_quantity := nullif(v_item->>'quantity', '')::numeric;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida para amenity.';
    end if;

    select * into v_inventory
    from public.inventory_items
    where id = v_item->>'inventoryItemId';

    if not found then
      raise exception 'Item de estoque não encontrado: %.', v_item->>'inventoryItemId';
    end if;

    if v_inventory.sector <> 'Governanca_Enxoval'
       or v_inventory.category <> 'Amenities de Quarto' then
      raise exception 'O item % não está classificado como Amenity de Quarto da Governança.', v_inventory.name;
    end if;
  end loop;

  select * into v_kit
  from public.room_amenity_kits
  where room_type_id = p_room_type_id
    and name = 'Padrão de Preparação'
  for update;

  if not found then
    insert into public.room_amenity_kits(name, room_type_id, active, notes, created_at, updated_at)
    values ('Padrão de Preparação', p_room_type_id, true, nullif(trim(p_notes), ''), v_now, v_now)
    returning * into v_kit;
  else
    update public.room_amenity_kits
    set active = true,
        notes = nullif(trim(p_notes), ''),
        updated_at = v_now
    where id = v_kit.id
    returning * into v_kit;
  end if;

  delete from public.room_amenity_kit_items
  where kit_id = v_kit.id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.room_amenity_kit_items(kit_id, inventory_item_id, quantity)
    values (
      v_kit.id,
      v_item->>'inventoryItemId',
      (v_item->>'quantity')::numeric
    );
  end loop;

  return jsonb_build_object(
    'id', v_kit.id,
    'name', v_kit.name,
    'roomTypeId', v_kit.room_type_id,
    'active', v_kit.active,
    'notes', v_kit.notes,
    'itemCount', jsonb_array_length(p_items)
  );
end;
$$;

revoke all on function public.save_room_amenity_kit_atomic(text, jsonb, text) from public;
revoke all on function public.save_room_amenity_kit_atomic(text, jsonb, text) from anon;
grant execute on function public.save_room_amenity_kit_atomic(text, jsonb, text) to authenticated;

comment on function public.save_room_amenity_kit_atomic(text, jsonb, text) is
  'Configura o padrão de amenities consumíveis por tipo de quarto. Não movimenta estoque; a baixa continua ocorrendo na conclusão da tarefa de Governança.';
