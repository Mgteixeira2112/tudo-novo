-- Impede reativação de itens do cardápio sem configuração operacional válida.
-- Escopo deliberadamente limitado ao RPC já usado pela Administração do Cardápio.

create or replace function public.set_menu_item_availability(
  p_menu_item_id text,
  p_available boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_menu public.menu_items%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select *
  into v_staff
  from public.staff_users
  where id = auth.uid()
    and active = true;

  if not found or not (
    v_staff.role = 'admin' or
    v_staff.permissions ? 'manage_menu' or
    v_staff.permissions ? 'manage_fnb'
  ) then
    raise exception 'Permissão insuficiente para administrar o cardápio.';
  end if;

  select *
  into v_menu
  from public.menu_items
  where id = p_menu_item_id
  for update;

  if not found then
    raise exception 'Item do cardápio não encontrado.';
  end if;

  if p_available then
    if v_menu.operational_type is null then
      raise exception 'Item % ainda não possui classificação operacional.', v_menu.name;
    end if;

    if v_menu.operational_type = 'simple' and v_menu.simple_inventory_item_id is null then
      raise exception 'Produto simples % não possui vínculo de estoque.', v_menu.name;
    end if;

    if v_menu.operational_type = 'recipe' and not exists (
      select 1
      from public.menu_item_ingredients mi
      where mi.menu_item_id = v_menu.id
    ) then
      raise exception 'Receita % não possui ingredientes na ficha técnica.', v_menu.name;
    end if;

    if v_menu.operational_type not in ('simple', 'recipe') then
      raise exception 'Tipo operacional inválido para o item %.', v_menu.name;
    end if;
  end if;

  update public.menu_items
  set available = p_available
  where id = p_menu_item_id;

  return (
    select value
    from jsonb_array_elements(public.menu_admin_snapshot()) value
    where value->>'id' = p_menu_item_id
    limit 1
  );
end;
$$;

revoke execute on function public.set_menu_item_availability(text, boolean) from public;
revoke execute on function public.set_menu_item_availability(text, boolean) from anon;
grant execute on function public.set_menu_item_availability(text, boolean) to authenticated;
