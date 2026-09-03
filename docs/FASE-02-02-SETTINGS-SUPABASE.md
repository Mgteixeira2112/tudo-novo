# FASE 2.2 — hotel_settings e perfil de equipe no Supabase

- `hotel_settings` passa a ser a fonte preferencial no backend quando o Supabase está configurado.
- JSON permanece somente como cache/fallback transitório até a FASE 2.7.
- leitura pública continua sanitizada pelo endpoint `/api/public/settings`.
- gravações administrativas de settings usam upsert no Supabase.
- autenticação do backend passa a resolver o perfil ativo diretamente em `public.staff_users`, pelo próprio JWT do usuário, em vez de buscar perfil no JSON.
- nenhuma alteração visual foi realizada.
- gerenciamento completo de múltiplos colaboradores e políticas administrativas de RLS será ampliado em checkpoint posterior; este passo remove a dependência do JSON do caminho crítico de autenticação.
