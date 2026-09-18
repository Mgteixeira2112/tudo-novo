-- Govermix: verificar a identidade e a visibilidade antes da auditoria agendada.
-- Apenas SELECT. O resultado DEVE ser exatamente OK; qualquer outro valor bloqueia o job.
-- Uma role PostgreSQL nova com GRANT SELECT, mas sem politica RLS adequada,
-- enxerga zero linhas e poderia produzir 17 falsos OK. Nao usar roles com BYPASSRLS.
WITH audited_tables(tablename) AS (
  VALUES ('reservations'), ('rooms'), ('kanban_tasks'), ('inventory_items'),
         ('stock_movements'), ('kitchen_orders'), ('financial_transactions'),
         ('notification_recipients'), ('operational_notifications'), ('staff_users')
),
table_access AS (
  SELECT t.tablename,
         has_table_privilege(format('public.%I', t.tablename), 'SELECT') AS can_read,
         has_table_privilege(format('public.%I', t.tablename),
           'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') AS can_modify,
         c.relrowsecurity AS rls_enabled,
         EXISTS (
           SELECT 1 FROM pg_policies p
           WHERE p.schemaname = 'public' AND p.tablename = t.tablename
             AND p.cmd IN ('SELECT', 'ALL')
             AND current_user = ANY (p.roles)
             AND p.qual = 'true'
         ) AS explicit_read_policy,
         EXISTS (
           SELECT 1 FROM pg_policies p
           WHERE p.schemaname = 'public' AND p.tablename = t.tablename
             AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
             AND ('public' = ANY (p.roles) OR current_user = ANY (p.roles))
         ) AS restrictive_read_policy
  FROM audited_tables t
  JOIN pg_class c ON c.oid = format('public.%I', t.tablename)::regclass
),
role_access AS (
  SELECT rolcanlogin AND NOT rolsuper AND NOT rolcreaterole
         AND NOT rolcreatedb AND NOT rolbypassrls AS safe_role
  FROM pg_roles WHERE rolname = current_user
)
SELECT CASE WHEN
  (SELECT COALESCE(bool_and(safe_role), false) FROM role_access)
  AND NOT pg_has_role(current_user, 'pg_read_all_data', 'member')
  AND NOT pg_has_role(current_user, 'pg_write_all_data', 'member')
  AND NOT has_schema_privilege('public', 'CREATE')
  AND (SELECT count(*) FROM table_access) = 10
  AND NOT EXISTS (
    SELECT 1 FROM table_access
    WHERE NOT can_read OR can_modify OR NOT rls_enabled
       OR NOT explicit_read_policy OR restrictive_read_policy
  )
  -- Os dois conjuntos essenciais devem estar visiveis. Zero linhas nao e prova de integridade.
  AND EXISTS (SELECT 1 FROM public.rooms)
  AND EXISTS (SELECT 1 FROM public.reservations)
THEN 'OK' ELSE 'FALHA' END AS preflight;
