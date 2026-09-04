-- NovoHotel — Central de Alertas Operacionais
-- Fase 3: Realtime das entregas individualizadas.
-- A tabela-mãe continua fora desta publicação; o cliente reage somente à entrega do próprio usuário via RLS.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notification_recipients'
  ) then
    alter publication supabase_realtime add table public.notification_recipients;
  end if;
end $$;
