# Auditoria operacional automática — ativação controlada

O workflow `Auditoria operacional (somente leitura)` reutiliza as 17 consultas em `supabase/audits/operational_integrity.sql` e publica um CSV e relatório no GitHub Actions. **Sem conexão configurada, o agendamento fica inativo.** A CI valida apenas o código e os testes offline; não prova que a auditoria agendada já funciona.

## Descoberta obrigatória sobre o RLS

As **dez tabelas auditadas têm RLS ativado**. Suas políticas existentes são destinadas a usuários da aplicação (`authenticated`/`auth.uid()`), não a uma conta PostgreSQL externa. Apenas conceder `GRANT SELECT` a uma nova conta pode devolver zero registros e gerar **17 falsos OK**. A conta `supabase_read_only_user` usada na conexão de inspeção tem `BYPASSRLS` e herda `pg_read_all_data`: **não use suas credenciais no GitHub**.

O job agora executa primeiro `supabase/audits/audit_access_preflight.sql`. Ele exige uma identidade não privilegiada, sem `BYPASSRLS`, sem participação em `pg_read_all_data`/`pg_write_all_data`, sem CREATE no schema e sem privilégios de escrita nas dez tabelas. Também verifica permissão SELECT, RLS ativo, política SELECT **específica para a role de auditoria com `USING (true)` em cada tabela**, ausência de políticas restritivas aplicáveis e visibilidade de pelo menos um quarto e uma reserva. Caso contrário, **falha antes de declarar qualquer resultado aprovado**.

A política dedicada deve ser criada/revisada por administrador do Supabase em migration versionada e com escopo exclusivo para a role de auditoria; não altere políticas dos usuários operacionais nem use `BYPASSRLS` como atalho. Para um SaaS multi-hotel, reavalie o desenho para retornar apenas agregados por tenant antes de permitir acesso cross-tenant. A conta deste estágio só deve ser usada em ambiente de testes autorizado.

## Ativação pelo administrador (necessária uma única vez)

1. Provisione uma credencial **PostgreSQL exclusiva para auditoria** com `LOGIN`, leitura apenas das dez tabelas do SQL, políticas RLS próprias revisadas e nenhum privilégio de escrita/admin. Revise a role, a migration RLS e o escopo de dados antes de ativar. O `PGOPTIONS` força `default_transaction_read_only=on` como proteção adicional, não substitui os privilégios reais. Não envie senha ou URL ao chat nem adicione credenciais ao repositório.
2. Em GitHub → `Mgteixeira2112/tudo-novo` → **Settings → Secrets and variables → Actions → Secrets → New repository secret**, crie `GOVERMIX_AUDIT_DATABASE_URL` com a URI PostgreSQL deste usuário (senha codificada para URL e TLS `sslmode=require` ou `verify-full` com CA confiável). Use endpoint acessível aos runners GitHub e restrinja exposição da credencial. Nunca use `VITE_*`, chave `service_role`, conta `postgres` ou `supabase_read_only_user`.
3. Em **Variables**, crie `GOVERMIX_AUDIT_ENABLED` com valor exato `true`. Sem ela, jobs agendados ficam ignorados. Para pausar, use `false`; revogue ou rode a senha se a credencial for comprometida.
4. GitHub → **Actions → Auditoria operacional (somente leitura) → Run workflow**, selecione **main**. Confira o preflight aprovado, o resultado do job, o resumo e o artifact `operational-audit-<run_id>`; exija 17 verificações, zero falhas e zero inconsistências antes de registrar homologação.

## Frequência e resposta a erros

- Cron diário: 11:17 UTC (08:17 em Brasília, UTC−3); o GitHub pode atrasar a execução. Uma execução manual inicial permite validar sem esperar o cron.
- Evidências: `results.csv` e `report.md` apenas com nomes técnicos e contagens agregadas, retidos 14 dias. Nenhum nome de hóspede é exportado.
- Falha de conexão, role excessiva, políticas ausentes, dados essenciais invisíveis, resultado incompleto ou inconsistência deixam o job vermelho. Investigue em PR/migration própria, sem afrouxar a segurança apenas para passar no teste. Não há envio próprio de WhatsApp ou e-mail neste checkpoint.

## Limites e homologação

O workflow não modifica tabelas e não executa transações de teste. O preflight verifica o desenho de leitura, mas não substitui revisão de segurança, RBAC, testes reais de RLS, concorrência, interface ou isolamento multi-hotel. A CI de PR executa apenas testes offline e build; a primeira execução real com a role correta na `main` continua necessária para homologar a automação.
