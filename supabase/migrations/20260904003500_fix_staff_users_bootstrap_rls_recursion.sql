create or replace function public.staff_users_empty()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.staff_users);
$$;

revoke all on function public.staff_users_empty() from public;
grant execute on function public.staff_users_empty() to authenticated;

alter policy bootstrap_first_admin
on public.staff_users
with check (
  auth.uid() = id
  and role = 'admin'
  and active = true
  and public.staff_users_empty()
);
