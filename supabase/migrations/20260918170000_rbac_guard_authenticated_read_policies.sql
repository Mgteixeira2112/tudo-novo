-- Auditoria manual RBAC: oito politicas SELECT aceitavam qualquer JWT authenticated,
-- inclusive usuario sem perfil ativo na equipe. Preservar os mesmos GRANTs e
-- conceder visibilidade apenas a integrantes ativos do hotel.
-- Nao altera login, tabelas, colunas, dados, papeis publicos ou politicas de escrita.
DO $preflight$
DECLARE v_unexpected text;
BEGIN
  WITH expected(tablename, policyname) AS (
    VALUES
      ('inventory_loss_damage_events','loss_damage_authenticated_read'),
      ('laundry_batch_items','laundry_batch_items_authenticated_read'),
      ('laundry_batches','laundry_batches_authenticated_read'),
      ('linen_movements','linen_movements_authenticated_read'),
      ('linen_positions','linen_positions_authenticated_read'),
      ('menu_item_demand_forecasts','menu_item_demand_forecasts_authenticated_read'),
      ('room_amenity_kit_items','room_amenity_kit_items_authenticated_read'),
      ('room_amenity_kits','room_amenity_kits_authenticated_read')
  )
  SELECT string_agg(e.tablename || '.' || e.policyname, ', ')
    INTO v_unexpected
    FROM expected e LEFT JOIN pg_policies p
      ON p.schemaname='public' AND p.tablename=e.tablename AND p.policyname=e.policyname
   WHERE p.policyname IS NULL OR p.cmd <> 'SELECT' OR p.roles <> ARRAY['authenticated']::name[]
      OR trim(coalesce(p.qual,'')) <> 'true';
  IF v_unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Politicas RBAC divergentes; revisar antes de migrar: %', v_unexpected;
  END IF;
END;
$preflight$;

ALTER POLICY loss_damage_authenticated_read ON public.inventory_loss_damage_events
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));
ALTER POLICY laundry_batch_items_authenticated_read ON public.laundry_batch_items
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));
ALTER POLICY laundry_batches_authenticated_read ON public.laundry_batches
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));
ALTER POLICY linen_movements_authenticated_read ON public.linen_movements
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));
ALTER POLICY linen_positions_authenticated_read ON public.linen_positions
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));
ALTER POLICY menu_item_demand_forecasts_authenticated_read ON public.menu_item_demand_forecasts
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));
ALTER POLICY room_amenity_kit_items_authenticated_read ON public.room_amenity_kit_items
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));
ALTER POLICY room_amenity_kits_authenticated_read ON public.room_amenity_kits
  USING (EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true));

DO $postflight$
DECLARE v_hardened integer;
BEGIN
  WITH expected(tablename, policyname) AS (
    VALUES
      ('inventory_loss_damage_events','loss_damage_authenticated_read'),
      ('laundry_batch_items','laundry_batch_items_authenticated_read'),
      ('laundry_batches','laundry_batches_authenticated_read'),
      ('linen_movements','linen_movements_authenticated_read'),
      ('linen_positions','linen_positions_authenticated_read'),
      ('menu_item_demand_forecasts','menu_item_demand_forecasts_authenticated_read'),
      ('room_amenity_kit_items','room_amenity_kit_items_authenticated_read'),
      ('room_amenity_kits','room_amenity_kits_authenticated_read')
  )
  SELECT count(*) INTO v_hardened FROM expected e JOIN pg_policies p
    ON p.schemaname='public' AND p.tablename=e.tablename AND p.policyname=e.policyname
   WHERE p.cmd='SELECT' AND p.roles=ARRAY['authenticated']::name[]
     AND p.qual LIKE '%auth.uid()%' AND p.qual LIKE '%active = true%';
  IF v_hardened <> 8 THEN
    RAISE EXCEPTION 'Politicas RBAC nao protegidas: % de 8.', v_hardened;
  END IF;
END;
$postflight$;
