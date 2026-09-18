# Auditoria operacional automática — ativação controlada

O workflow `Auditoria operacional (somente leitura)` executa 17 checagens e publica somente nomes de verificações e contagens no GitHub Actions. A auditoria **não está ativa** até que uma conexão segura seja configurada e uma execução real seja validada.

## Preparação técnica feita pelo projeto

A migration `20260918153000_audit_aggregate_only_reader.sql` cria a role **`govermix_audit_reader` inicialmente `NOLOGIN`, sem senha**, e o schema privado `govermix_audit` com duas views agregadas: `operational_integrity` (17 verificações) e `scope_counts` (apenas totais de quartos e reservas). A role recebe `USAGE` no schema e `SELECT` apenas nas views, **nenhum SELECT nas dez tabelas originais, nenhum acesso a registros individuais e nenhuma permissão de escrita**. O schema não deve ser incluído na lista de schemas expostos pela API Supabase. A role não possui `BYPASSRLS` nem herda `pg_read_all_data`.

Views de segurança padrão executam como o proprietário (esperado: `postgres`), que pode consultar os dados das tabelas. O workflow valida dono da view, ausência de `security_invoker=true`, falta de acesso direto às tabelas e existência de dados básicos ANTES de executar o relatório. Nada disso concede acesso à role dos funcionários ou altera políticas RLS operacionais. O SQL original em `supabase/audits/operational_integrity.sql` continua disponível somente para auditoria manual autorizada; o GitHub executa exclusivamente `SELECT ... FROM govermix_audit.operational_integrity`.

**Limite SaaS:** o relatório é agregado do projeto, não segmentado por hotel. Ative somente em ambiente de testes autorizado até existir isolamento multi-hotel verificado e critérios explícitos para estatísticas globais. Mesmo sendo agregados, as contagens não devem ser publicadas em logs abertos.

## Ativação — única intervenção necessária do administrador

1. Confirmar que a migration foi aplicada, que a role consta como `NOLOGIN` e que os testes de permissões e equivalência de contagens foram aprovados. Se não foi, pare e solicite a validação; não tente conceder SELECT manualmente.
2. Com seu gerenciador de senhas, gerar uma senha longa e exclusiva. No SQL Editor privado do projeto de testes Supabase, executar **somente após aprovação técnica**: `ALTER ROLE govermix_audit_reader LOGIN PASSWORD '<SENHA_FORTE_GERADA_POR_VOCE>';` (substituir apenas o trecho entre aspas, sem enviar a senha ao chat). Se o dashboard oferecer redefinição da senha da role via interface, prefira essa opção. Não deixar a senha no histórico compartilhado, prints ou arquivos. Não usar postgres, service_role ou supabase_read_only_user.
3. Obter o host/porta/endpoint de conexão PostgreSQL do projeto pela aba Connect do Supabase. Montar a URI com usuário `govermix_audit_reader`, senha codificada para URL, base `postgres` e TLS `sslmode=require` ou `verify-full`; conferir suporte de rede/IPv4/pooler para GitHub Actions.
4. GitHub → repositório `Mgteixeira2112/tudo-novo` → Settings → Secrets and variables → Actions → Secrets → New repository secret. Nome `GOVERMIX_AUDIT_DATABASE_URL`; valor a URI exclusiva. **Nunca** usar prefixo `VITE_` nem salvar em arquivo, commit, print ou conversa.
5. Na aba Variables criar `GOVERMIX_AUDIT_ENABLED` = `true`. Para pausar, definir `false`; manual `workflow_dispatch` ainda pode tentar executar se o secret estiver presente.
6. GitHub → Actions → `Auditoria operacional (somente leitura)` → Run workflow → `main`. Verificar pré-verificação verde, 17/17 checagens, zero falhas e relatório/artifact agregados. Só então registrar homologação.

## Frequência, resultados e segurança

- Cron: diariamente 11:17 UTC (08:17 Brasília UTC−3), sujeito a atraso do GitHub. Primeiro disparo manual após configuração.
- Arquivos `results.csv` e `report.md`: nomes técnicos e contagens, sem registros individuais; retenção de 14 dias. Evitar tornar os artifacts acessíveis fora de membros autorizados; o repositório é público.
- Falha de segredo, conexão, role, ACL, owner das views, dados essenciais invisíveis ou qualquer inconsistência deixa o job vermelho. CI verde valida apenas os testes offline e o build, não acesso real ao banco.
- A conta não deve acessar registros individuais. Nunca usar BYPASSRLS ou GRANT SELECT nas tabelas para fazer o workflow passar. Para revogar: variável false, `ALTER ROLE govermix_audit_reader NOLOGIN`, excluir secret/rotacionar senha.
- Escopo não cobre RLS/RBAC da aplicação, segurança de todos os módulos, concorrência, UX, liquidação financeira completa ou isolamento multi-hotel. Esses testes seguem checkpoints separados.
