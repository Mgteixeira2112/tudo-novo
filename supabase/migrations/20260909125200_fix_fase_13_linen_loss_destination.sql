-- FASE 13 — correção do destino terminal de perdas definitivas de enxoval

alter table public.linen_movements
  drop constraint if exists linen_movements_to_location_check;

alter table public.linen_movements
  add constraint linen_movements_to_location_check
  check (to_location in ('Rouparia','Quarto','Lavanderia','Perda_Avaria'));
