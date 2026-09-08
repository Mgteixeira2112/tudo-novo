create or replace function public.get_kds_operations_overview(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with valid_display as (
    select 1
    from public.kds_displays d
    where d.token = p_token
      and d.active = true
      and d.preset = 'operations'
    limit 1
  ),
  operational_day as (
    select (now() at time zone 'America/Sao_Paulo')::date as day
  )
  select case
    when exists (select 1 from valid_display) then jsonb_build_object(
      'server_date', (select day::text from operational_day),
      'room_status', jsonb_build_object(
        'total', (select count(*) from public.rooms),
        'available', (select count(*) from public.rooms where status = 'Disponivel'),
        'occupied', (select count(*) from public.rooms where status = 'Ocupado'),
        'cleaning', (select count(*) from public.rooms where status = 'Limpeza'),
        'maintenance', (select count(*) from public.rooms where status = 'Manutencao'),
        'blocked', (select count(*) from public.rooms where status = 'Bloqueado')
      ),
      'arrivals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id,
          'guest_name', r.guest_name,
          'room_number', r.room_number,
          'status', r.status
        ) order by r.room_number asc, r.guest_name asc)
        from public.reservations r, operational_day o
        where r.check_in_date = o.day
          and r.status = 'Pendente'
      ), '[]'::jsonb),
      'departures', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id,
          'guest_name', r.guest_name,
          'room_number', r.room_number,
          'status', r.status
        ) order by r.room_number asc, r.guest_name asc)
        from public.reservations r, operational_day o
        where r.check_out_date = o.day
          and r.status = 'CheckIn'
      ), '[]'::jsonb),
      'kitchen_orders', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', k.id,
          'order_number', k.order_number,
          'room_number', k.room_number,
          'status', k.status,
          'created_at', k.created_at
        ) order by k.created_at asc)
        from public.kitchen_orders k
        where k.status in ('Recebido', 'Em Preparo', 'Pronto')
      ), '[]'::jsonb),
      'housekeeping_rooms', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id,
          'number', r.number,
          'floor', r.floor
        ) order by r.floor asc, r.number asc)
        from public.rooms r
        where r.status = 'Limpeza'
      ), '[]'::jsonb),
      'maintenance_rooms', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id,
          'number', r.number,
          'floor', r.floor
        ) order by r.floor asc, r.number asc)
        from public.rooms r
        where r.status = 'Manutencao'
      ), '[]'::jsonb)
    )
    else jsonb_build_object(
      'server_date', null,
      'room_status', jsonb_build_object('total', 0, 'available', 0, 'occupied', 0, 'cleaning', 0, 'maintenance', 0, 'blocked', 0),
      'arrivals', '[]'::jsonb,
      'departures', '[]'::jsonb,
      'kitchen_orders', '[]'::jsonb,
      'housekeeping_rooms', '[]'::jsonb,
      'maintenance_rooms', '[]'::jsonb
    )
  end;
$$;

revoke all on function public.get_kds_operations_overview(text) from public;
grant execute on function public.get_kds_operations_overview(text) to anon, authenticated;
