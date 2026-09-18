# Auditoria operacional automática — ativação controlada

A PR deste checkpoint adiciona o workflow `Auditoria operacional (somente leitura)` e um validador de CSV com testes offline. Reutiliza sem alterações as 17 consultas em `supabase/audits/operational_integrity.sql`. **Sem conexão configurada, o agendamento fica inativo.** Não significa que já há auditoria automática em execução.

## Ativação pelo administrador (necessária uma única vez)

1. Providencie uma credencial **PostgreSQL exclusiva para auditoria**, com `LOGIN`, acesso de leitura somente às dez tabelas citadas pela consulta SQL e sem `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, privilégios administrativos ou capacidade de assumir outro papel. A identidade administrativa do banco e a chave `service_role` **não** devem ser utilizadas. Um administrador do Supabase deve revisar/provisionar o papel com política de senhas e rotação adequada. O `PGOPTIONS` do job impõe também `default_transaction_read_only=on`, mas não substitui as permissões efetivas do papel. Não envie senha nem URL para o chat ou arquivos do repositório.
2. Em GitHub → `Mgteixeira2112/tudo-novo` → **Settings → Secrets and variables → Actions → Secrets → New repository secret**, configure `GOVERMIX_AUDIT_DATABASE_URL` com a URI PostgreSQL desse usuário (URL codificada e com TLS `sslmode=require` ou `verify-full` com CA confiável). Utilize endpoint com alcance a partir dos runners GitHub e limite a exposição da credencial por política organizacional. Não use `VITE_*`, variáveis do frontend ou connection string de administrador.
3. Na aba **Variables**, crie `GOVERMIX_AUDIT_ENABLED` com valor literal `true`. Sem essa variável, execuções agendadas ficam **ignoradas**, sem produzir um falso resultado verde. Se precisar interromper, altere para `false` e revogue/rotacione o secret quando cabível.
4. GitHub → **Actions → Auditoria operacional (somente leitura) → Run workflow**, selecionando **main**. Confira resultado do job, resumo e artifact `operational-audit-<run_id>`; confirme 17 verificações, zero falhas e zero inconsistências antes de registrar homologação.

## Frequência e resposta a erros

- Cron: diariamente 11:17 UTC (08:17 de Brasília no fuso UTC−3); o GitHub pode atrasar a execução. A primeira execução pode ser feita manualmente.
- Dados de saída: `results.csv` e `report.md` com **nomes técnicos de verificações e contagens agregadas**, sem listar nomes de hóspedes ou registros. Retenção de 14 dias. O resumo aparece no próprio workflow.
- Falhas de conexão, credencial ausente, CSV inválido, contagem diferente de 17 e qualquer inconsistência geram execução **vermelha**. Verifique o histórico do Actions e notificações configuradas para falhas; não há envio de email/WhatsApp próprio neste checkpoint.
- Para investigar, execute a consulta original com acesso autorizado e corrija o defeito em PR separada. **Não** adicione acesso de escrita, grants amplos ou dados pessoais para fazer o teste passar.

## Limites e homologação

O workflow não modifica tabelas e não executa transações de teste. As verificações cobrem somente as regras previstas no SQL; não comprovam RLS, RBAC, disponibilidade sob concorrência, comportamento visual nem isolamento multi-hotel. A CI de PR executa **somente os testes offline do validador**, não conecta no Supabase. Não declare o agendamento funcional antes de verificar uma execução real de `workflow_dispatch` na `main` depois da configuração do secret e da variável.
