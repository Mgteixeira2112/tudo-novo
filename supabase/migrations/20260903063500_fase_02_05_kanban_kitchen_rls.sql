drop policy if exists "anon_read_menu_items" on public.menu_items;
create policy "anon_read_menu_items" on public.menu_items for select to anon using (available = true);

drop policy if exists "authenticated_read_menu_items" on public.menu_items;
create policy "authenticated_read_menu_items" on public.menu_items for select to authenticated using (exists (select 1 from public.staff_users s where s.id = auth.uid() and s.active = true));

drop policy if exists "authenticated_read_kitchen_orders" on public.kitchen_orders;
create policy "authenticated_read_kitchen_orders" on public.kitchen_orders for select to authenticated using (exists (select 1 from public.staff_users s where s.id = auth.uid() and s.active = true));

drop policy if exists "authenticated_manage_kitchen_orders" on public.kitchen_orders;
create policy "authenticated_manage_kitchen_orders" on public.kitchen_orders for all to authenticated using (exists (select 1 from public.staff_users s where s.id = auth.uid() and s.active = true and (s.role = 'admin' or (s.permissions ? 'manage_fnb')))) with check (exists (select 1 from public.staff_users s where s.id = auth.uid() and s.active = true and (s.role = 'admin' or (s.permissions ? 'manage_fnb'))));

drop policy if exists "authenticated_read_kanban_tasks" on public.kanban_tasks;
create policy "authenticated_read_kanban_tasks" on public.kanban_tasks for select to authenticated using (exists (select 1 from public.staff_users s where s.id = auth.uid() and s.active = true));

drop policy if exists "authenticated_manage_kanban_tasks" on public.kanban_tasks;
create policy "authenticated_manage_kanban_tasks" on public.kanban_tasks for all to authenticated using (exists (select 1 from public.staff_users s where s.id = auth.uid() and s.active = true and (s.role = 'admin' or (s.permissions ? 'manage_all_kanbans')))) with check (exists (select 1 from public.staff_users s where s.id = auth.uid() and s.active = true and (s.role = 'admin' or (s.permissions ? 'manage_all_kanbans'))));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kitchen_orders') then alter publication supabase_realtime add table public.kitchen_orders; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kanban_tasks') then alter publication supabase_realtime add table public.kanban_tasks; end if;
end $$;
