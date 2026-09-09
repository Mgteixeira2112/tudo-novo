create or replace function public.get_operational_forecast(
  p_target_date date default (current_date + 1)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_target_date date := coalesce(p_target_date, current_date + 1);
  v_total_rooms integer := 0;
  v_expected_rooms integer := 0;
  v_expected_guests numeric := 0;
  v_checkins integer := 0;
  v_checkouts integer := 0;
  v_occupancy_pct numeric := 0;
  v_guest_nights_28d numeric := 0;
  v_same_dow_guest_nights numeric := 0;
  v_same_dow_sample_days integer := 0;
  v_recipes jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (
    v_staff.role = 'admin'
    or v_staff.permissions ? 'view_inventory'
    or v_staff.permissions ? 'manage_inventory'
  ) then
    raise exception 'Permissão insuficiente para visualizar previsão operacional.';
  end if;

  select count(*) into v_total_rooms from public.rooms;

  select
    count(*),
    coalesce(sum(greatest(coalesce(r.adults,0) + coalesce(r.children,0), 0)),0)
  into v_expected_rooms, v_expected_guests
  from public.reservations r
  where r.check_in_date <= v_target_date
    and r.check_out_date > v_target_date
    and r.checked_out_at is null
    and coalesce(lower(r.status),'') not in ('checkout','cancelada','cancelado','cancelled','canceled');

  select count(*) into v_checkins
  from public.reservations r
  where r.check_in_date = v_target_date
    and r.checked_out_at is null
    and coalesce(lower(r.status),'') not in ('checkout','cancelada','cancelado','cancelled','canceled');

  select count(*) into v_checkouts
  from public.reservations r
  where r.check_out_date = v_target_date
    and r.checked_out_at is null
    and coalesce(lower(r.status),'') not in ('checkout','cancelada','cancelado','cancelled','canceled');

  v_occupancy_pct := case when v_total_rooms > 0
    then round((v_expected_rooms::numeric / v_total_rooms::numeric) * 100, 1)
    else 0 end;

  with hist_days as (
    select d::date as day
    from generate_series(current_date - interval '27 days', current_date, interval '1 day') d
  ), guest_by_day as (
    select d.day,
      coalesce(sum(
        case
          when r.id is null then 0
          else greatest(coalesce(r.adults,0) + coalesce(r.children,0), 0)
        end
      ),0)::numeric as guests
    from hist_days d
    left join public.reservations r
      on r.checked_in_at is not null
     and r.checked_in_at::date <= d.day
     and (r.checked_out_at is null or r.checked_out_at::date > d.day)
     and coalesce(lower(r.status),'') not in ('cancelada','cancelado','cancelled','canceled')
    group by d.day
  )
  select
    coalesce(sum(guests),0),
    coalesce(sum(guests) filter (where extract(dow from day) = extract(dow from v_target_date)),0),
    count(*) filter (
      where guests > 0
        and extract(dow from day) = extract(dow from v_target_date)
    )
  into v_guest_nights_28d, v_same_dow_guest_nights, v_same_dow_sample_days
  from guest_by_day;

  with eligible as (
    select mi.id, mi.name
    from public.menu_items mi
    where mi.available = true
      and mi.operational_type = 'recipe'
      and exists (
        select 1 from public.menu_item_ingredients mii
        where mii.menu_item_id = mi.id
      )
  ), order_units as (
    select
      e->>'menuItemId' as menu_item_id,
      coalesce(sum((e->>'quantity')::numeric),0)::numeric as units_28d,
      coalesce(sum((e->>'quantity')::numeric) filter (
        where extract(dow from k.created_at::date) = extract(dow from v_target_date)
      ),0)::numeric as units_same_dow
    from public.kitchen_orders k
    cross join lateral jsonb_array_elements(k.items) e
    where k.created_at >= current_date - interval '27 days'
      and coalesce(lower(k.status),'') not in ('cancelado','cancelada','cancelled','canceled')
      and (e ? 'menuItemId')
    group by e->>'menuItemId'
  ), calc as (
    select
      e.id,
      e.name,
      coalesce(ou.units_28d,0)::numeric as units_28d,
      coalesce(ou.units_same_dow,0)::numeric as units_same_dow,
      case when v_guest_nights_28d > 0
        then round(coalesce(ou.units_28d,0) / v_guest_nights_28d, 4)
        else 0 end as rate_per_guest,
      case
        when v_same_dow_sample_days >= 3
         and v_same_dow_guest_nights > 0
         and v_guest_nights_28d > 0
         and coalesce(ou.units_28d,0) > 0
        then round(
          (coalesce(ou.units_same_dow,0) / v_same_dow_guest_nights)
          / (coalesce(ou.units_28d,0) / v_guest_nights_28d),
          2
        )
        else 1::numeric
      end as weekday_factor,
      coalesce(mf.quantity,0)::numeric as manual_forecast
    from eligible e
    left join order_units ou on ou.menu_item_id = e.id
    left join public.menu_item_demand_forecasts mf
      on mf.menu_item_id = e.id and mf.forecast_date = v_target_date
  ), final as (
    select c.*,
      greatest(0, ceil(c.rate_per_guest * v_expected_guests * c.weekday_factor))::numeric as suggested_units,
      case
        when v_guest_nights_28d >= 30 and c.units_28d >= 5 and v_same_dow_sample_days >= 3 then 'Alta'
        when v_guest_nights_28d >= 10 and c.units_28d >= 2 then 'Média'
        else 'Baixa'
      end as confidence
    from calc c
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'menu_item_id', f.id,
    'menu_item_name', f.name,
    'manual_forecast', f.manual_forecast,
    'historical_units_28d', f.units_28d,
    'rate_per_guest', f.rate_per_guest,
    'weekday_factor', f.weekday_factor,
    'suggested_units', f.suggested_units,
    'confidence', f.confidence,
    'reason', case
      when v_guest_nights_28d = 0 then 'Sem histórico confiável de hóspedes; sugestão mantida em zero.'
      when f.units_28d = 0 then 'Receita sem consumo histórico suficiente; use previsão manual até formar histórico.'
      when v_same_dow_sample_days < 3 then 'Taxa histórica por hóspede; fator de dia da semana neutro por amostra insuficiente.'
      else 'Taxa histórica por hóspede ajustada pelo padrão do mesmo dia da semana.'
    end
  ) order by f.name), '[]'::jsonb)
  into v_recipes
  from final f;

  return jsonb_build_object(
    'target_date', v_target_date,
    'signals', jsonb_build_object(
      'total_rooms', v_total_rooms,
      'expected_rooms', v_expected_rooms,
      'expected_guests', v_expected_guests,
      'occupancy_pct', v_occupancy_pct,
      'checkins', v_checkins,
      'checkouts', v_checkouts,
      'historical_guest_nights_28d', v_guest_nights_28d,
      'same_weekday_sample_days', v_same_dow_sample_days,
      'seasonality', 'Neutro — sem fonte confiável cadastrada.',
      'events', 'Neutro — sem fonte confiável cadastrada.'
    ),
    'recipes', v_recipes,
    'methodology', 'Sugestão = taxa histórica de unidades por hóspede × hóspedes previstos × fator de dia da semana. O fator semanal só é aplicado com pelo menos 3 dias comparáveis. Nenhuma previsão manual é sobrescrita automaticamente.'
  );
end;
$$;

revoke all on function public.get_operational_forecast(date) from public;
revoke all on function public.get_operational_forecast(date) from anon;
grant execute on function public.get_operational_forecast(date) to authenticated;
