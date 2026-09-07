revoke execute on function public.kds_can_manage() from anon;
revoke execute on function public.list_kds_displays() from anon;
revoke execute on function public.create_kds_display(text, text) from anon;
revoke execute on function public.update_kds_display(uuid, text, text, boolean) from anon;
revoke execute on function public.rotate_kds_display_token(uuid) from anon;

-- Public KDS link intentionally exposes only token-bound read/heartbeat RPCs.
grant execute on function public.get_kds_public(text) to anon, authenticated;
grant execute on function public.heartbeat_kds_display(text) to anon, authenticated;
