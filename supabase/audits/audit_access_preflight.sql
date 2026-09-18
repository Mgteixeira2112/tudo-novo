-- Govermix: somente SELECT; a saida deve ser EXATAMENTE OK.
-- O leitor tecnico nao pode consultar tabelas operacionais diretamente.
-- Somente as views agregadas com owner auditado podem ler dados via RLS.
WITH audited_tables(tablename) AS (
  VALUES ('reservations'), ('rooms'), ('kanban_tasks'), ('inventory_items'),
         ('stock_movements'), ('kitchen_orders'), ('financial_transactions'),
         ('notification_recipients'), ('operational_notifications'), ('staff_users')
), table_access AS (
  SELECT t.tablename,
         has_table_privilege(format('public.%I', t.tablename), 'SELECT') AS can_read,
         has_table_privilege(format('public.%I', t.tablename),
           'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') AS can_modify,
         c.relrowsecurity AS rls_enabled
  FROM audited_tables t
  JOIN pg_class c ON c.oid = format('public.%I', t.tablename)::regclass
), audit_views AS (
  SELECT c.relname, c.relkind = 'v' AS is_view,
         pg_get_userbyid(c.relowner) = 'postgres' AS approved_owner,
         NOT ('security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::text[]))) AS definer_view
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'govermix_audit'
    AND c.relname IN ('operational_integrity', 'scope_counts')
), role_access AS (
  SELECT rolcanlogin AND NOT rolsuper AND NOT rolcreaterole
         AND NOT rolcreatedb AND NOT rolbypassrls AND NOT rolreplication
         AS safe_role
  FROM pg_roles WHERE rolname = current_user
)
SELECT CASE WHEN
  current_user = 'govermix_audit_reader'
  AND (SELECT COALESCE(bool_and(safe_role), false) FROM role_access)
  AND NOT pg_has_role(current_user, 'pg_read_all_data', 'member')
  AND NOT pg_has_role(current_user, 'pg_write_all_data', 'member')
  AND NOT has_schema_privilege('public', 'CREATE')
  AND NOT has_schema_privilege('govermix_audit', 'CREATE')
  AND has_schema_privilege('govermix_audit', 'USAGE')
  AND has_table_privilege('govermix_audit.operational_integrity', 'SELECT')
  AND has_table_privilege('govermix_audit.scope_counts', 'SELECT')
  AND (SELECT count(*) FROM table_access) = 10
  AND NOT EXISTS (SELECT 1 FROM table_access WHERE can_read OR can_modify OR NOT rls_enabled)
  AND (SELECT count(*) FROM audit_views WHERE is_view AND approved_owner AND definer_view) = 2
  AND (SELECT rooms_total > 0 AND reservations_total > 0 FROM govermix_audit.scope_counts)
  AND (SELECT count(*) = 17 FROM govermix_audit.operational_integrity)
THEN 'OK' ELSE 'FALHA' END AS preflight;
