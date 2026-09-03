# FASE 2.5 — Kanban + Room Service/Cozinha no Supabase

- `menu_items`, `kitchen_orders` e `kanban_tasks` passam a usar Supabase como fonte preferencial nas rotas operacionais.
- O cardápio-base foi migrado para a nuvem; tarefas demo não foram copiadas.
- GitHub Pages possui fallback direto de leitura para cardápio, pedidos e Kanban.
- `kitchen_orders` e `kanban_tasks` permanecem no Supabase Realtime.
- Nenhum INSERT anônimo direto foi liberado para pedidos.
- JSON permanece fallback transitório até a FASE 2.7.
