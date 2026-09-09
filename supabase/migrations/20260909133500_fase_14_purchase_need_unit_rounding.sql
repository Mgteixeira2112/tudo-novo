create or replace function public.get_purchase_need_dashboard()
returns table (
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
  ), base as (
    select i.*,
      coalesce(c.today_qty,0) as consumption_today,
      coalesce(c.seven_day_qty,0) as consumption_7d,
      round(coalesce(c.seven_day_qty,0)/7.0,2) as daily_average,
      greatest(0,(coalesce(c.seven_day_qty,0)/7.0)+i.min_stock-i.current_stock) as raw_suggestion
    from public.inventory_items i
    left join consumption c on c.item_id=i.id
  ), calc as (
    select b.*,
      case when lower(b.unit) in ('un','und','unid','unidade','unidades')
        then ceil(b.raw_suggestion)
        else round(b.raw_suggestion,2)
      end as suggested_quantity
    from base b
  )
  select c.id,c.name,c.sector,c.unit,c.current_stock,c.min_stock,c.max_stock,
    c.consumption_today,c.consumption_7d,c.daily_average,c.daily_average,
    c.min_stock,c.suggested_quantity,round(c.suggested_quantity*c.cost_price,2),
    case
      when c.current_stock <= c.min_stock then 'Estoque atual abaixo ou igual ao mínimo.'
      when c.suggested_quantity > 0 then 'Cobertura insuficiente para a demanda média prevista + estoque de segurança.'
      else 'Estoque suficiente para a demanda média prevista.'
    end
  from calc c
  order by c.suggested_quantity desc,c.current_stock-c.min_stock asc,c.name;
end;
$$;
