create or replace function public.get_kds_housekeeping_rooms(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.kds_displays d
      where d.token = p_token
        and d.active = true
        and d.preset = 'housekeeping'
    ) then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'number', r.number,
          'floor', r.floor,
          'type_name', r.type_name,
          'notes', r.notes,
          'status', r.status
        )
        order by r.floor asc, r.number asc
      )
      from public.rooms r
      where r.status = 'Limpeza'
    ), '[]'::jsonb)
    else '[]'::jsonb
  end;
$$;

revoke all on function public.get_kds_housekeeping_rooms(text) from public;
grant execute on function public.get_kds_housekeeping_rooms(text) to anon, authenticated;
