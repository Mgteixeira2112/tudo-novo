-- FASE 6 — hardening de acesso da RPC de consumo do frigobar
revoke all on function public.register_minibar_consumption_atomic(text,text,integer,text) from public;
revoke all on function public.register_minibar_consumption_atomic(text,text,integer,text) from anon;
grant execute on function public.register_minibar_consumption_atomic(text,text,integer,text) to authenticated;
