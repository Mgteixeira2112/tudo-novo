-- Garante idempotência dos alertas de pedidos da cozinha.
-- Um mesmo kitchen_order pode ser observado por clientes antigos e pelo trigger
-- de banco. Mantemos somente o primeiro alerta por pedido e impedimos novas
-- duplicidades sem afetar outros tipos de alerta que podem repetir origem.

with ranked as (
  select
    id,
    row_number() over (
      partition by source_id
      order by created_at asc, id asc
    ) as rn
  from public.operational_notifications
  where type = 'kitchen_order_created'
    and source_type = 'kitchen_order'
)
delete from public.operational_notifications n
using ranked r
where n.id = r.id
  and r.rn > 1;

create unique index if not exists uq_operational_notifications_kitchen_order_created
  on public.operational_notifications (source_id)
  where type = 'kitchen_order_created'
    and source_type = 'kitchen_order';
