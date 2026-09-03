# FASE 2.7 — Supabase como fonte única de produção

- `NODE_ENV=production` não lê nem grava `hotel_database.json`.
- Repositórios persistentes migrados falham de forma explícita se o Supabase estiver indisponível; não retornam dados JSON.
- Kanban, cardápio e pedidos exigem Supabase em produção.
- Rotas Express ainda legadas de Frigobar, Financeiro e Inventário são bloqueadas em produção para impedir dupla fonte de verdade.
- O frontend publicado no GitHub Pages continua usando os repositórios diretos autenticados do Supabase para esses módulos.
- Desenvolvimento local pode manter fallback JSON, controlável por `ALLOW_LOCAL_JSON_FALLBACK=false`.

## Critério de segurança
Falha de Supabase em produção deve ser visível como erro; nunca deve resultar em dados demo/JSON aparentemente válidos.
