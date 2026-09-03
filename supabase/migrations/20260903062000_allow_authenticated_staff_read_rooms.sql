create policy "authenticated_staff_read_rooms"
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    where su.id = auth.uid()
      and su.active = true
  )
);
