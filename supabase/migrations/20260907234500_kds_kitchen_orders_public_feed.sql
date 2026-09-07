create or replace function public.get_kds_kitchen_orders(p_token text)
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
        and d.preset = 'kitchen'
    ) then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'order_number', o.order_number,
          'room_number', o.room_number,
          'guest_name', o.guest_name,
          'items', o.items,
          'destination', o.destination,
          'delivery_sector', o.delivery_sector,
          'status', o.status,
          'special_instructions', o.special_instructions,
          'created_at', o.created_at
        )
        order by o.created_at asc
      )
      from public.kitchen_orders o
      where o.status in ('Recebido', 'Em Preparo', 'Pronto')
    ), '[]'::jsonb)
    else '[]'::jsonb
  end;
$$;

revoke all on function public.get_kds_kitchen_orders(text) from public;
grant execute on function public.get_kds_kitchen_orders(text) to anon, authenticated;
