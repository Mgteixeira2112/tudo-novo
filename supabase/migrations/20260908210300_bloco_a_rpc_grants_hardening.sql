-- Bloco A — RPCs administrativos nunca devem ser executáveis pelo papel anon.

revoke execute on function public.menu_admin_snapshot() from anon;
revoke execute on function public.save_menu_item_atomic(jsonb) from anon;
revoke execute on function public.set_menu_item_availability(text,boolean) from anon;
revoke execute on function public.create_inventory_item_from_menu(jsonb) from anon;

revoke execute on function public.menu_admin_snapshot() from public;
revoke execute on function public.save_menu_item_atomic(jsonb) from public;
revoke execute on function public.set_menu_item_availability(text,boolean) from public;
revoke execute on function public.create_inventory_item_from_menu(jsonb) from public;

grant execute on function public.menu_admin_snapshot() to authenticated;
grant execute on function public.save_menu_item_atomic(jsonb) to authenticated;
grant execute on function public.set_menu_item_availability(text,boolean) to authenticated;
grant execute on function public.create_inventory_item_from_menu(jsonb) to authenticated;
