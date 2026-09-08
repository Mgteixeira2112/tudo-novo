-- NovoHotel — alertas operacionais nas telas KDS
-- Feed somente leitura, protegido pelo token da tela e filtrado pelo preset.
-- Não expõe entregas individuais nem preferências dos usuários.

create or replace function public.get_kds_operational_alerts(p_token text)
returns table (
  id uuid,
  type text,
  priority text,
  title text,
  message text,
  sector text,
  source_type text,
  source_id text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with active_display as (
    select preset
    from public.kds_displays
    where token = p_token
      and active = true
    limit 1
  )
  select
    n.id,
    n.type,
    n.priority,
    n.title,
    n.message,
    n.sector,
    n.source_type,
    n.source_id,
    n.created_at
  from public.operational_notifications n
  cross join active_display d
  where n.responsible_user_id is null
    and n.created_at >= now() - interval '12 hours'
    and (
      d.preset = 'operations'
      or (
        d.preset = 'kitchen'
        and (
          lower(coalesce(n.sector, '')) in ('cozinha', 'roomservice', 'room service')
          or lower(n.source_type) in ('kitchen_order', 'room_service')
        )
      )
      or (
        d.preset = 'housekeeping'
        and (
          lower(coalesce(n.sector, '')) in ('governanca', 'governança')
          or lower(n.source_type) in ('governance_room_cleaning', 'governance_task')
        )
      )
      or (
        d.preset = 'maintenance'
        and (
          lower(coalesce(n.sector, '')) in ('manutencao', 'manutenção')
          or lower(n.source_type) in ('maintenance_room_status', 'maintenance_task')
        )
      )
      or (
        d.preset = 'frontdesk'
        and (
          lower(coalesce(n.sector, '')) in ('recepcao', 'recepção')
          or lower(n.source_type) in ('reservation', 'checkin', 'checkout', 'check_in', 'check_out')
        )
      )
    )
  order by n.created_at desc
  limit 20;
$$;

revoke all on function public.get_kds_operational_alerts(text) from public;
grant execute on function public.get_kds_operational_alerts(text) to anon, authenticated;

comment on function public.get_kds_operational_alerts(text) is
  'Feed de alertas operacionais para KDS, protegido por token ativo e filtrado pelo preset da tela. Não retorna alertas individuais.';
