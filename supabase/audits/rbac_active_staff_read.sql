-- Auditoria manual de RBAC, somente leitura. Nao testa uma sessao autenticada real.
-- Resultado esperado: expected_policies=8, protected_policies=8,
-- unguarded_policies=0, missing_policies=0, overly_broad_authenticated_reads=0.
WITH expected(tablename,policyname) AS (
  VALUES
    ('inventory_loss_damage_events','loss_damage_authenticated_read'),
    ('laundry_batch_items','laundry_batch_items_authenticated_read'),
    ('laundry_batches','laundry_batches_authenticated_read'),
    ('linen_movements','linen_movements_authenticated_read'),
    ('linen_positions','linen_positions_authenticated_read'),
    ('menu_item_demand_forecasts','menu_item_demand_forecasts_authenticated_read'),
    ('room_amenity_kit_items','room_amenity_kit_items_authenticated_read'),
    ('room_amenity_kits','room_amenity_kits_authenticated_read')
), policies AS (
  SELECT e.tablename,e.policyname,p.cmd,p.roles,p.qual,
         p.policyname IS NOT NULL AS exists_policy,
         p.cmd='SELECT' AND p.roles=ARRAY['authenticated']::name[]
           AND p.qual LIKE '%auth.uid()%' AND p.qual LIKE '%active = true%' AS protected
    FROM expected e LEFT JOIN pg_policies p ON p.schemaname='public'
      AND p.tablename=e.tablename AND p.policyname=e.policyname
)
SELECT (SELECT count(*) FROM expected) AS expected_policies,
       count(*) FILTER (WHERE protected) AS protected_policies,
       count(*) FILTER (WHERE exists_policy AND NOT coalesce(protected,false)) AS unguarded_policies,
       count(*) FILTER (WHERE NOT exists_policy) AS missing_policies,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.cmd IN ('SELECT','ALL')
           AND 'authenticated'=ANY(p.roles) AND trim(p.qual) IN ('true','(true)')) AS overly_broad_authenticated_reads
FROM policies;
