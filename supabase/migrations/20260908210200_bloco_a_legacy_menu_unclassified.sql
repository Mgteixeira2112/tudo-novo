-- Itens legados sem vínculo não devem ser classificados arbitrariamente.
-- Novos itens continuam obrigados a informar simple/recipe pela RPC de gravação.

alter table public.menu_items
  alter column operational_type drop not null,
  alter column operational_type drop default;

update public.menu_items
set operational_type = null
where operational_type = 'simple'
  and simple_inventory_item_id is null
  and not exists (
    select 1 from public.menu_item_ingredients mi where mi.menu_item_id = menu_items.id
  );
