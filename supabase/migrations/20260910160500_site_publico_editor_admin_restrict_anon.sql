revoke execute on function public.save_public_site_settings(text, jsonb) from anon;
revoke execute on function public.save_public_site_settings(text, jsonb) from public;
grant execute on function public.save_public_site_settings(text, jsonb) to authenticated;
