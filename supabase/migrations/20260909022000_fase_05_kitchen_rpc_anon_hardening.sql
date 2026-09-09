-- FASE 5 — hardening da RPC de pedidos de cozinha
-- Remove grant explícito legado do papel anon e preserva execução somente para autenticados.

revoke all on function public.create_kitchen_order_atomic(text,jsonb,text,text,text) from public;
revoke all on function public.create_kitchen_order_atomic(text,jsonb,text,text,text) from anon;
grant execute on function public.create_kitchen_order_atomic(text,jsonb,text,text,text) to authenticated;
