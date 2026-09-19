# Auditoria de egress PostgREST — 18/09/2026

## Evidência de consumo informada no painel

- Uso no período: 5,81 GB; franquia apresentada: 5 GB; excesso: 0,81 GB.
- No detalhe apresentado para 27/08, PostgREST: 66,722 MB (99,5%); Realtime: 314,083 KB (0,5%). Não extrapolar essa proporção automaticamente para os demais dias.
- Atribuição causal aos módulos ainda não verificada: faltam medidas de endpoints, tamanhos das respostas e sessões ativas.

## Código verificado na branch principal

- `src/main.tsx` redireciona explicitamente no GitHub Pages os métodos `api.getSettings`, `api.getSupabaseStatus`, `api.getGuests`, `api.getRooms`, `api.getReservations`, `api.getTasks`, `api.getTransactions` e `api.getFinancialStats` às respectivas implementações cloud/Supabase. Portanto, NÃO afirmar que essas leituras necessariamente tentam `/api` primeiro na publicação GitHub Pages.
- `src/context/HotelContext.tsx`: `refreshData()` carrega nove conjuntos no login/restauração; polling autenticado a cada 6 segundos consulta sete conjuntos (`rooms`, `reservations`, `tasks`, `financialStats`, `transactions`, `supabaseStatus`, `users`). Reservas também são recarregadas quando chega um evento Realtime.
- `src/services/api.ts` ainda define alguns métodos com `fetch('/api/...')`; investigar individualmente quais não são sobrescritos e quais são chamados no GitHub Pages, antes de alterar endpoints.

## Mudanças recomendadas para PR seguinte (ainda NÃO implementadas)

1. Medir com DevTools Network, por tela e sessão: chamadas `/rest/v1/`, contagem/minuto, response size transferido, status e rota; não registrar tokens ou dados pessoais.
2. Mapear `api.getUsers` e quaisquer chamadas `/api` remanescentes no GitHub Pages; examinar autorização antes de alterar o transporte.
3. Em PR pequena, deduplicar requisições simultâneas e limitar leituras de conjuntos estáticos; manter fallback confiável para Realtime, preservando sincronização dos módulos.
4. Testar login/RBAC, reservas, quartos, tarefas, finanças, KDS e múltiplas sessões. Medir egress antes/depois na mesma janela e carga comparável.

Esta documentação é somente diagnóstico: sem alteração de código de produção, banco, `main`, deploy ou promessa de redução do egress.