# Auditoria operacional consolidada

Consulta única: [`supabase/audits/operational_integrity.sql`](../supabase/audits/operational_integrity.sql).

## Como executar

1. Abra o SQL Editor do projeto Supabase correto, com acesso autorizado.
2. Cole e execute **todo o arquivo SQL**. É somente `SELECT`, não cria função, não altera dados e não exige `service_role` no frontend.
3. Verifique `checks_total`, `failed_checks`, `issues_total` e a coluna `result` de cada linha. Se houver `FALHA`, investigue a verificação específica e corrija em PR/migration separada.
4. Registre data, projeto, commit, resultado e evidências no checklist da homologação. Após qualquer alteração, rode a consulta novamente.

## Cobertura (17 verificações)

- Reservas ativas e vínculos com quartos; sobreposição de reservas confirmadas/ativas por quarto.
- Unicidade, vínculo, status e datas das tarefas operacionais de Governança/Manutenção.
- Estoque negativo ou inválido, movimentações associadas a tarefas e deltas de compra/consumo/perda.
- Pedidos e lançamentos financeiros vinculados a reservas existentes.
- Entregas de alerta, destinatários duplicados ou ausentes e origem de alertas de reservas.

## Limites e segurança

- Resultado `OK` indica apenas ausência das inconsistências **cobertas no instante da consulta**. Não atesta isoladamente RLS, autorização, fluxo visual, concorrência real, liquidação financeira completa ou multi-hotel.
- Movimentações `Transferencia` e `Ajuste_Inventario` têm semânticas próprias e **não** são avaliadas pela fórmula de saldo de compra/consumo.
- Nenhuma credencial, dados pessoais ou acesso privilegiado devem ser adicionados ao repositório ou logs da CI.
- A CI existente realiza build e typecheck consultivo, **não conecta ao Supabase e não executa este SQL automaticamente**. A automação não assistida deverá ser avaliada em outra PR com credenciais segregadas e autorização de leitura mínima.
- Testes que modificam dados devem rodar em ambiente de homologação isolado; esta auditoria é somente leitura.

## Critério de aceite deste checkpoint

A consulta deve executar sem erro no Supabase, produzir 17 linhas e retornar `failed_checks=0` e `issues_total=0` para o conjunto de dados atual. Isso valida apenas o checkpoint da auditoria consolidada, não conclui a homologação geral do Govermix.
