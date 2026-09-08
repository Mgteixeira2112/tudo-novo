-- Bloco A — permite criar produto/ingrediente de estoque sem sair da administração do cardápio.

create or replace function public.create_inventory_item_from_menu(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_item public.inventory_items%rowtype;
  v_max numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_staff from public.staff_users where id=auth.uid() and active=true;
  if not found or not (
    v_staff.role='admin' or
    v_staff.permissions ? 'manage_menu' or
    v_staff.permissions ? 'manage_fnb'
  ) then
    raise exception 'Permissão insuficiente para cadastrar ingrediente.';
  end if;

  if trim(coalesce(p_payload->>'name','')) = '' then raise exception 'Nome é obrigatório.'; end if;
  if trim(coalesce(p_payload->>'unit','')) = '' then raise exception 'Unidade é obrigatória.'; end if;
  if coalesce((p_payload->>'currentStock')::numeric,0) < 0 then raise exception 'Estoque atual inválido.'; end if;
  if coalesce((p_payload->>'minStock')::numeric,0) < 0 then raise exception 'Estoque mínimo inválido.'; end if;
  v_max := nullif(p_payload->>'maxStock','')::numeric;
  if v_max is not null and v_max < coalesce((p_payload->>'minStock')::numeric,0) then
    raise exception 'Estoque máximo não pode ser menor que o mínimo.';
  end if;

  insert into public.inventory_items(
    id,sku,name,sector,category,current_stock,min_stock,max_stock,unit,cost_price,
    selling_price,supplier,location_barcode,updated_at
  ) values (
    'inv_'||replace(gen_random_uuid()::text,'-',''),
    coalesce(nullif(trim(p_payload->>'sku'),''),'SKU-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
    trim(p_payload->>'name'),
    coalesce(nullif(p_payload->>'sector',''),'Alimentos_Bebidas'),
    coalesce(nullif(p_payload->>'category',''),'Ingredientes'),
    coalesce((p_payload->>'currentStock')::numeric,0),
    coalesce((p_payload->>'minStock')::numeric,0),
    v_max,
    p_payload->>'unit',
    greatest(coalesce((p_payload->>'costPrice')::numeric,0),0),
    null,
    nullif(p_payload->>'supplier',''),
    null,
    now()
  ) returning * into v_item;

  return jsonb_build_object(
    'id',v_item.id,'sku',v_item.sku,'name',v_item.name,'sector',v_item.sector,
    'category',v_item.category,'currentStock',v_item.current_stock,'minStock',v_item.min_stock,
    'maxStock',v_item.max_stock,'unit',v_item.unit,'costPrice',v_item.cost_price,
    'supplier',v_item.supplier,'updatedAt',v_item.updated_at
  );
end;
$$;

revoke all on function public.create_inventory_item_from_menu(jsonb) from public;
grant execute on function public.create_inventory_item_from_menu(jsonb) to authenticated;
