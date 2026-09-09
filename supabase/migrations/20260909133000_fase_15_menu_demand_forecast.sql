create table if not exists public.menu_item_demand_forecasts (
  id text primary key default ('forecast_' || replace(gen_random_uuid()::text, '-', '')),
  menu_item_id text not null references public.menu_items(id) on delete cascade,
  forecast_date date not null,
  quantity numeric not null check (quantity > 0),
  created_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(menu_item_id, forecast_date)
);

create index if not exists idx_menu_item_demand_forecasts_date
  on public.menu_item_demand_forecasts(forecast_date, menu_item_id);

alter table public.menu_item_demand_forecasts enable row level security;
revoke all on public.menu_item_demand_forecasts from anon;
grant select on public.menu_item_demand_forecasts to authenticated;

drop policy if exists menu_item_demand_forecasts_authenticated_read on public.menu_item_demand_forecasts;
create policy menu_item_demand_forecasts_authenticated_read
  on public.menu_item_demand_forecasts for select to authenticated using (true);

create or replace function public.set_menu_item_demand_forecast(
  p_menu_item_id text,
  p_forecast_date date,
  p_quantity numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_menu public.menu_items%rowtype;
  v_ingredients integer;
  v_id text;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (
    v_staff.role = 'admin'
    or v_staff.permissions ? 'manage_inventory'
  ) then
    raise exception 'Permissão insuficiente para alterar previsão de produção.';
  end if;

  if p_forecast_date is null or p_forecast_date < current_date then
    raise exception 'A previsão deve ser para hoje ou uma data futura.';
  end if;

  select * into v_menu from public.menu_items where id = p_menu_item_id;
  if not found then raise exception 'Item do cardápio não encontrado.'; end if;
  if coalesce(v_menu.operational_type, '') <> 'recipe' then
    raise exception 'Somente receitas compostas podem receber previsão de produção nesta fase.';
  end if;

  select count(*) into v_ingredients
  from public.menu_item_ingredients
  where menu_item_id = p_menu_item_id and quantity > 0;

  if v_ingredients = 0 then
    raise exception 'A receita precisa possuir ficha técnica válida antes da previsão.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    delete from public.menu_item_demand_forecasts
    where menu_item_id = p_menu_item_id and forecast_date = p_forecast_date;

    return jsonb_build_object(
      'menuItemId', p_menu_item_id,
      'forecastDate', p_forecast_date,
      'quantity', 0,
      'removed', true
    );
  end if;

  insert into public.menu_item_demand_forecasts(menu_item_id, forecast_date, quantity, created_by)
  values (p_menu_item_id, p_forecast_date, p_quantity, auth.uid())
  on conflict (menu_item_id, forecast_date)
  do update set quantity = excluded.quantity, updated_at = now(), created_by = auth.uid()
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'menuItemId', p_menu_item_id,
    'forecastDate', p_forecast_date,
    'quantity', p_quantity,
    'removed', false
  );
end;
$$;

revoke all on function public.set_menu_item_demand_forecast(text,date,numeric) from public;
revoke all on function public.set_menu_item_demand_forecast(text,date,numeric) from anon;
grant execute on function public.set_menu_item_demand_forecast(text,date,numeric) to authenticated;

create or replace function public.get_menu_demand_forecast_setup(p_forecast_date date default current_date + 1)
returns table(
  menu_item_id text,
  menu_item_name text,
  ingredient_count integer,
  forecast_quantity numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (
    v_staff.role = 'admin'
    or v_staff.permissions ? 'view_inventory'
    or v_staff.permissions ? 'manage_inventory'
  ) then
    raise exception 'Permissão insuficiente para visualizar previsão de produção.';
  end if;

  return query
  select m.id, m.name,
    count(mi.id)::integer as ingredient_count,
    coalesce(f.quantity, 0)::numeric as forecast_quantity
  from public.menu_items m
  join public.menu_item_ingredients mi on mi.menu_item_id = m.id and mi.quantity > 0
  left join public.menu_item_demand_forecasts f
    on f.menu_item_id = m.id and f.forecast_date = p_forecast_date
  where m.available = true and m.operational_type = 'recipe'
  group by m.id, m.name, f.quantity
  order by m.name;
end;
$$;

revoke all on function public.get_menu_demand_forecast_setup(date) from public;
revoke all on function public.get_menu_demand_forecast_setup(date) from anon;
grant execute on function public.get_menu_demand_forecast_setup(date) to authenticated;

drop function if exists public.get_purchase_need_dashboard();

create function public.get_purchase_need_dashboard()
returns table(
  item_id text,
  item_name text,
  sector text,
  unit text,
  current_stock numeric,
  min_stock numeric,
  max_stock numeric,
  consumption_today numeric,
  consumption_7d numeric,
  daily_average numeric,
  menu_forecast_demand numeric,
  forecast_demand numeric,
  safety_stock numeric,
  suggested_quantity numeric,
  estimated_cost numeric,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff from public.staff_users where id = auth.uid() and active = true;
  if not found or not (
    v_staff.role = 'admin'
    or v_staff.permissions ? 'view_inventory'
    or v_staff.permissions ? 'manage_inventory'
  ) then
    raise exception 'Permissão insuficiente para visualizar necessidade de compras.';
  end if;

  return query
  with consumption as (
    select sm.item_id,
      coalesce(sum(sm.quantity) filter (where sm.timestamp >= date_trunc('day', now())), 0)::numeric as today_qty,
      coalesce(sum(sm.quantity) filter (where sm.timestamp >= now() - interval '7 days'), 0)::numeric as seven_day_qty
    from public.stock_movements sm
    where sm.type in ('Saida_Consumo_Interno','Saida_Consumo_Quarto','Saida_Venda_A_B')
      and sm.timestamp >= now() - interval '7 days'
    group by sm.item_id
  ), menu_forecast as (
    select mi.inventory_item_id as item_id,
      sum(mi.quantity * f.quantity)::numeric as forecast_qty
    from public.menu_item_demand_forecasts f
    join public.menu_items m on m.id = f.menu_item_id
    join public.menu_item_ingredients mi on mi.menu_item_id = f.menu_item_id
    where f.forecast_date = current_date + 1
      and f.quantity > 0
      and m.available = true
      and m.operational_type = 'recipe'
      and mi.quantity > 0
    group by mi.inventory_item_id
  ), base as (
    select i.*,
      coalesce(c.today_qty,0)::numeric as consumption_today,
      coalesce(c.seven_day_qty,0)::numeric as consumption_7d,
      round(coalesce(c.seven_day_qty,0)/7.0,2)::numeric as daily_average,
      coalesce(mf.forecast_qty,0)::numeric as menu_forecast_demand
    from public.inventory_items i
    left join consumption c on c.item_id = i.id
    left join menu_forecast mf on mf.item_id = i.id
  ), calc_base as (
    select b.*,
      round(b.daily_average + b.menu_forecast_demand,2)::numeric as forecast_demand,
      greatest(0,(b.daily_average + b.menu_forecast_demand)+b.min_stock-b.current_stock)::numeric as raw_suggestion
    from base b
  ), calc as (
    select b.*,
      case when lower(b.unit) in ('un','und','unid','unidade','unidades')
        then ceil(b.raw_suggestion)
        else round(b.raw_suggestion,2)
      end::numeric as suggested_quantity
    from calc_base b
  )
  select c.id,c.name,c.sector,c.unit,c.current_stock,c.min_stock,c.max_stock,
    c.consumption_today,c.consumption_7d,c.daily_average,c.menu_forecast_demand,c.forecast_demand,
    c.min_stock,c.suggested_quantity,round(c.suggested_quantity*c.cost_price,2),
    case
      when c.menu_forecast_demand > 0 and c.current_stock <= c.min_stock then 'Estoque abaixo ou igual ao mínimo e com demanda prevista pelo cardápio de amanhã.'
      when c.menu_forecast_demand > 0 then 'Demanda prevista pelo cardápio de amanhã somada ao consumo médio real.'
      when c.current_stock <= c.min_stock then 'Estoque atual abaixo ou igual ao mínimo.'
      when c.suggested_quantity > 0 then 'Cobertura insuficiente para a demanda média prevista + estoque de segurança.'
      else 'Estoque suficiente para a demanda média prevista.'
    end
  from calc c
  order by c.suggested_quantity desc,c.current_stock-c.min_stock asc,c.name;
end;
$$;

revoke all on function public.get_purchase_need_dashboard() from public;
revoke all on function public.get_purchase_need_dashboard() from anon;
grant execute on function public.get_purchase_need_dashboard() to authenticated;
