-- Somente leitura. Confirma existencia, comando, propriedade e equipe ativa.
-- A auditoria estrutural nao substitui testes de duas sessoes autenticadas reais.
WITH expected(tablename,policyname,expected_cmd,check_required) AS (
  VALUES
    ('notification_recipients','notification_recipients_select_own','SELECT',false),
    ('notification_recipients','notification_recipients_update_own','UPDATE',true),
    ('operational_notifications','operational_notifications_select_recipient','SELECT',false),
    ('user_notification_preferences','user_notification_preferences_insert_own','INSERT',true),
    ('user_notification_preferences','user_notification_preferences_select_own','SELECT',false),
    ('user_notification_preferences','user_notification_preferences_update_own','UPDATE',true)
), inspected AS (
  SELECT e.*, p.policyname IS NOT NULL AS present,
    p.cmd=e.expected_cmd AND p.roles=ARRAY['authenticated']::name[]
      AND p.qual LIKE '%auth.uid()%'
      AND p.qual LIKE '%s.id = auth.uid()%'
      AND p.qual LIKE '%s.active = true%'
      AND (e.tablename='operational_notifications'
           AND p.qual LIKE '%nr.user_id = auth.uid()%'
           OR e.tablename<>'operational_notifications'
              AND (e.expected_cmd='INSERT' OR p.qual LIKE '%user_id = auth.uid()%'))
      AS guarded_using,
    NOT e.check_required OR (
      p.with_check LIKE '%user_id = auth.uid()%'
      AND p.with_check LIKE '%s.id = auth.uid()%'
      AND p.with_check LIKE '%s.active = true%'
    ) AS guarded_check
  FROM expected e LEFT JOIN pg_policies p
    ON p.schemaname='public' AND p.tablename=e.tablename AND p.policyname=e.policyname
)
SELECT count(*) expected_policies,
  count(*) FILTER (WHERE present) present_policies,
  count(*) FILTER (WHERE guarded_using AND guarded_check) protected_policies,
  count(*) FILTER (WHERE NOT present) missing_policies,
  count(*) FILTER (WHERE present AND NOT (coalesce(guarded_using,false) AND coalesce(guarded_check,false))) unguarded_policies,
  (SELECT count(*) FROM public.notification_recipients nr
     WHERE NOT EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id=nr.user_id AND s.active=true)) stale_recipients_in_database
FROM inspected;
