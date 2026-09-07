create or replace function public.validate_kds_display_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kds_displays
    where token = p_token
      and active = true
  );
$$;

revoke all on function public.validate_kds_display_token(text) from public;
grant execute on function public.validate_kds_display_token(text) to anon, authenticated;
