create or replace function public.get_kds_frontdesk_overview(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with hotel_day as (
    select timezone('America/Sao_Paulo', now())::date as today
  )
  select case
    when exists (
      select 1
      from public.kds_displays d
      where d.token = p_token
        and d.active = true
        and d.preset = 'frontdesk'
    ) then jsonb_build_object(
      'server_date', (select today from hotel_day),
      'rooms', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'number', r.number,
            'floor', r.floor,
            'type_name', r.type_name,
            'status', r.status,
            'current_guest_name', r.current_guest_name
          ) order by r.floor, r.number
        )
        from public.rooms r
      ), '[]'::jsonb),
      'arrivals', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', res.id,
            'code', res.code,
            'guest_name', res.guest_name,
            'room_number', res.room_number,
            'room_type_name', res.room_type_name,
            'check_in_date', res.check_in_date,
            'status', res.status
          ) order by res.room_number nulls last, res.guest_name
        )
        from public.reservations res
        where res.check_in_date = (select today from hotel_day)
          and res.status = 'Pendente'
      ), '[]'::jsonb),
      'departures', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', res.id,
            'code', res.code,
            'guest_name', res.guest_name,
            'room_number', res.room_number,
            'room_type_name', res.room_type_name,
            'check_out_date', res.check_out_date,
            'status', res.status
          ) order by res.room_number nulls last, res.guest_name
        )
        from public.reservations res
        where res.check_out_date = (select today from hotel_day)
          and res.status = 'CheckIn'
      ), '[]'::jsonb)
    )
    else jsonb_build_object(
      'server_date', (select today from hotel_day),
      'rooms', '[]'::jsonb,
      'arrivals', '[]'::jsonb,
      'departures', '[]'::jsonb
    )
  end;
$$;

revoke all on function public.get_kds_frontdesk_overview(text) from public;
grant execute on function public.get_kds_frontdesk_overview(text) to anon, authenticated;
