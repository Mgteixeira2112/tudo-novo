# Auditoria de egress PostgREST — 18/09/2026

## Evidência de consumo informada no painel

- Uso no período: 5,81 GB; franquia apresentada: 5 GB; excesso: 0,81 GB.
- No detalhe apresentado para 27/08, PostgREST: 66,722 MB (99,5%); Realtime: 314,083 KB (0,5%). Não extrapolar essa proporção automaticamente para os demais dias.
- Atribuição causal aos módulos ainda não verificada: faltam medidas de endpoints, tamanhos das respostas e sessões ativas.

## Código verificado na branch principal

- `src/main.tsx` redireciona explicitamente no GitHub Pages os métodos `api.getSettings`, `api.getSupabaseStatus`, `api.getGuests`, `api.getRooms`, `api.getReservations`, `api.getTasks`, `api.getTransactions` e `api.getFinancialStats` às respectivas implementações cloud/Supabase. Portanto, NÃO afirmar que essas leituras necessariamente tentam `/api` primeiro na publicação GitHub Pages.
- `src/context/HotelContext.tsx`: `refreshData()` carrega nove conjuntos no login/restauração; polling autenticado a cada 6 segundos consulta sete conjuntos (`rooms`, `reservations`, `tasks`, `financialStats`, `transactions`, `supabaseStatus`, `users`). Reservas também são recarregadas quando chega um evento Realtime.
- `src/services/api.ts` ainda define alguns métodos com `fetch('/api/...')`; investigar individualmente quais não são sobrescritos e quais são chamados no GitHub Pages, antes de alterar endpoints.

## Verificação adicional do código

- O intervalo autenticado em `src/context/HotelContext.tsx` dispara sete leituras por ciclo de seis segundos (até 70 chamadas/minuto por sessão se todas forem efetivamente executadas). Trata-se de capacidade teórica do ciclo, NÃO de contagem observada de requisições PostgREST ou egress.
- `api.getUsers()` é acionado tanto no intervalo quanto pelo callback `subscribeToStaffUsersRealtime` quando há alteração de colaboradores. Verificar segurança/RBAC e frequência efetiva antes de remover o intervalo.
- `api.getReservations()` é chamado no intervalo, além da leitura `loadReservationsFromSupabase()` disparada pelo evento Realtime. Identificar sobreposição e confiabilidade do canal antes de deduplicar.
- `api.getSupabaseStatus()` está no intervalo apesar de não ser dado operacional de atualização subsegundo; candidato a carga sob demanda, sujeito à confirmação de quem usa o estado.
- Uma chamada que rejeita não demonstra egress elevado por si só: quantificar respostas reais do PostgREST antes de atribuir causalidade.

## Protocolo de medição seguro (antes/depois)

1. Abrir o sistema autenticado no Chrome e pressionar F12 > Network; selecionar Fetch/XHR, marcar Preserve log e limpar registros.
2. Deixar UMA sessão com a MESMA tela aberta por 5 minutos, sem navegar. Registrar número de chamadas `supabase.co/rest/v1/`, endpoint sem query sensível, status, bytes transferidos e duração. Evitar capturas/HAR com cabeçalhos Authorization, tokens, cookies, dados de hóspedes ou payloads pessoais.
3. Repetir, isoladamente, na recepção, Kanban e KDS; registrar número de telas e usuários ativos. Uma aba KDS deve permanecer funcionando mesmo quando não está visível.
4. Registrar separadamente `/api/` com erro, respostas de Auth e Realtime, sem equiparar bytes de DevTools automaticamente à métrica faturada pelo Supabase.
5. Comparar período equivalente no Dashboard Usage por categoria, com carga e janela semelhantes, somente depois de homologar a mudança no navegador.

## Mudanças recomendadas para PR seguinte (ainda NÃO implementadas)

1. Medir chamadas `/rest/v1/`, contagem/minuto, transfer size, status e rota, sem credenciais nem dados pessoais.
2. Mapear `api.getUsers` e quaisquer chamadas `/api` remanescentes no GitHub Pages; examinar autorização antes de alterar o transporte.
3. Em PR pequena, deduplicar requisições simultâneas e limitar leituras de conjuntos estáticos; manter fallback confiável para Realtime, preservando sincronização dos módulos.
4. Testar login/RBAC, reservas, quartos, tarefas, finanças, KDS e múltiplas sessões. Medir egress antes/depois na mesma janela e carga comparável.

Esta documentação é somente diagnóstico: sem alteração de código de produção, banco, `main`, deploy ou promessa de redução do egress.