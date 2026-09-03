drop policy if exists reservations_staff_select on public.reservations;
create policy reservations_staff_select on public.reservations
for select to authenticated
using (
  exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
  )
);
