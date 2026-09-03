# FASE 2.1 — Inventário Supabase e schema operacional

## Estado encontrado

- Projeto Supabase alvo: `novo hotel` (`izuymcuzbggrdkezwxyu`).
- Antes desta fase, a única tabela pública existente era `staff_users`.
- `staff_users` foi preservada sem alterações para não afetar o login administrativo já validado.
- O PMS ainda usa `hotel_database.json` como fonte operacional nesta etapa; nenhuma leitura/escrita foi desviada para o Supabase ainda.

## Migration aplicada

Migration Supabase: `fase_02_01_core_operational_schema`.

Tabelas operacionais criadas:

- `hotel_settings`
- `guests`
- `rooms`
- `reservations`
- `minibar_items`
- `room_consumptions`
- `menu_items`
- `kitchen_orders`
- `kanban_tasks`
- `financial_transactions`
- `inventory_items`
- `stock_movements`

Com `staff_users`, o schema público passa a ter 13 tabelas.

## Segurança

- RLS foi habilitado nas 12 tabelas operacionais novas.
- Nenhuma policy pública foi criada nesta fase.
- Portanto, a migration é estrutural e não expõe os dados novos via chave anon.
- As políticas específicas por hotel/usuário serão tratadas na fase de multi-tenancy/RLS.

## Integridade inicial

Foram adicionados índices para reservas, quartos, hóspedes, Kanban, financeiro e estoque, além de constraints básicas de datas e quantidade de hóspedes em reservas.

## Próximo checkpoint

FASE 2.2: criar a camada de repositórios Supabase e migrar primeiro `hotel_settings` e perfis de equipe, mantendo fallback controlado até a validação completa.
