create or replace function public.current_staff_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_users su
    where su.id = auth.uid()
      and su.active = true
      and (
        su.role = 'admin'
        or coalesce(su.permissions, '[]'::jsonb) ? p_permission
      )
  );
$$;

grant execute on function public.current_staff_has_permission(text) to authenticated;

create policy guests_read_authorized_staff
on public.guests for select to authenticated
using (
  public.current_staff_has_permission('view_guests')
  or public.current_staff_has_permission('manage_guests')
);

create policy guests_insert_authorized_staff
on public.guests for insert to authenticated
with check (public.current_staff_has_permission('manage_guests'));

create policy guests_update_authorized_staff
on public.guests for update to authenticated
using (public.current_staff_has_permission('manage_guests'))
with check (public.current_staff_has_permission('manage_guests'));

create policy guests_delete_authorized_staff
on public.guests for delete to authenticated
using (public.current_staff_has_permission('manage_guests'));

create policy staff_manage_read
on public.staff_users for select to authenticated
using (public.current_staff_has_permission('manage_users'));

create policy staff_manage_insert
on public.staff_users for insert to authenticated
with check (public.current_staff_has_permission('manage_users'));

create policy staff_manage_update
on public.staff_users for update to authenticated
using (public.current_staff_has_permission('manage_users'))
with check (public.current_staff_has_permission('manage_users'));

create policy staff_manage_delete
on public.staff_users for delete to authenticated
using (public.current_staff_has_permission('manage_users'));
