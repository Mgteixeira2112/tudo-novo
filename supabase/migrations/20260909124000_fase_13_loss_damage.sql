-- FASE 13 — Perdas e Avarias

create table if not exists public.inventory_loss_damage_events (
  id text primary key default ('loss_' || replace(gen_random_uuid()::text, '-', '')),
  item_id text not null references public.inventory_items(id) on delete restrict,
  item_name text not null,
  occurrence_type text not null check (occurrence_type in ('Perda','Rasgo','Dano','Extravio','Descarte')),
  quantity numeric not null check (quantity > 0),
  unit text not null,
  definitive boolean not null default true,
  source_location text,
  room_number text,
  operator text not null,
  notes text,
  stock_movement_id text references public.stock_movements(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_loss_damage_events_created on public.inventory_loss_damage_events(created_at desc);
create index if not exists idx_loss_damage_events_item on public.inventory_loss_damage_events(item_id, created_at desc);

alter table public.inventory_loss_damage_events enable row level security;
revoke all on public.inventory_loss_damage_events from anon;
grant select on public.inventory_loss_damage_events to authenticated;

drop policy if exists loss_damage_authenticated_read on public.inventory_loss_damage_events;
create policy loss_damage_authenticated_read
  on public.inventory_loss_damage_events for select to authenticated using (true);

create or replace function public.register_loss_damage_atomic(
  p_item_id text,
  p_occurrence_type text,
  p_quantity numeric,
  p_definitive boolean default true,
  p_source_location text default null,
  p_room_number text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
  v_item public.inventory_items%rowtype;
  v_position public.linen_positions%rowtype;
  v_event_id text := 'loss_' || replace(gen_random_uuid()::text, '-', '');
  v_movement_id text;
  v_operator text;
  v_occurrence text := trim(coalesce(p_occurrence_type, ''));
  v_source text := trim(coalesce(p_source_location, ''));
  v_room text := trim(coalesce(p_room_number, ''));
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_now timestamptz := now();
  v_previous numeric;
  v_new numeric;
  v_total numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_staff
  from public.staff_users
  where id = auth.uid() and active = true;

  if not found or not (v_staff.role = 'admin' or v_staff.permissions ? 'manage_inventory') then
    raise exception 'Permissão insuficiente para registrar perda ou avaria.';
  end if;

  if v_occurrence not in ('Perda','Rasgo','Dano','Extravio','Descarte') then
    raise exception 'Tipo de ocorrência inválido.';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantidade deve ser maior que zero.'; end if;

  select * into v_item from public.inventory_items where id = p_item_id for update;
  if not found then raise exception 'Item de estoque não encontrado.'; end if;

  v_operator := coalesce(nullif(trim(v_staff.full_name), ''), 'Sistema');
  v_previous := v_item.current_stock;
  v_new := v_previous;

  if p_definitive then
    if v_previous < p_quantity then
      raise exception 'Quantidade indisponível. Estoque atual: % %.', v_previous, v_item.unit;
    end if;

    v_new := v_previous - p_quantity;

    if v_item.category = 'Enxoval & Rouparia' then
      if v_source not in ('Rouparia','Quarto','Lavanderia') then
        raise exception 'Informe a posição física do enxoval.';
      end if;
      if v_source = 'Quarto' and v_room = '' then
        raise exception 'Informe o quarto onde ocorreu a perda ou avaria.';
      end if;
      if v_source <> 'Quarto' then v_room := ''; end if;

      select * into v_position
      from public.linen_positions
      where item_id = v_item.id
        and location_type = v_source
        and room_number = v_room
      for update;

      if not found or v_position.quantity < p_quantity then
        raise exception 'Quantidade insuficiente na posição informada. Disponível: % %.', coalesce(v_position.quantity,0), v_item.unit;
      end if;

      update public.linen_positions
      set quantity = quantity - p_quantity, updated_at = v_now
      where id = v_position.id;

      insert into public.linen_movements(
        item_id,item_name,quantity,from_location,to_location,
        from_room_number,to_room_number,operator,moved_at,notes
      ) values (
        v_item.id,v_item.name,p_quantity,v_source,'Perda_Avaria',
        nullif(v_room,''),null,v_operator,v_now,
        v_occurrence || ' definitiva' || case when v_notes is null then '' else ': ' || v_notes end
      );
    elsif v_source = '' then
      v_source := v_item.sector;
    end if;

    update public.inventory_items
    set current_stock = v_new, updated_at = v_now
    where id = v_item.id;

    if v_item.category = 'Enxoval & Rouparia' then
      select coalesce(sum(quantity),0) into v_total
      from public.linen_positions where item_id = v_item.id;
      if v_total <> v_new then
        raise exception 'Integridade do enxoval violada: posições somam %, estoque físico é %.', v_total, v_new;
      end if;
    end if;

    v_movement_id := 'mov_' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text || '_' || floor(random()*10000)::int::text;
    insert into public.stock_movements(
      id,timestamp,item_id,item_name,sector,type,quantity,
      previous_stock,new_stock,unit_cost,total_cost,
      origin_location,destination_location,related_room_number,
      operator,document_number,notes
    ) values (
      v_movement_id,v_now,v_item.id,v_item.name,v_item.sector,'Perda_Avaria',p_quantity,
      v_previous,v_new,v_item.cost_price,v_item.cost_price*p_quantity,
      nullif(v_source,''),'Descarte / Perda',nullif(v_room,''),
      v_operator,v_event_id,
      v_occurrence || case when v_notes is null then '' else ' — ' || v_notes end
    );
  end if;

  insert into public.inventory_loss_damage_events(
    id,item_id,item_name,occurrence_type,quantity,unit,definitive,
    source_location,room_number,operator,notes,stock_movement_id,created_at
  ) values (
    v_event_id,v_item.id,v_item.name,v_occurrence,p_quantity,v_item.unit,p_definitive,
    nullif(v_source,''),nullif(v_room,''),v_operator,v_notes,v_movement_id,v_now
  );

  return jsonb_build_object(
    'eventId',v_event_id,
    'movementId',v_movement_id,
    'definitive',p_definitive,
    'previousStock',v_previous,
    'newStock',v_new,
    'operator',v_operator,
    'createdAt',v_now
  );
end;
$$;

revoke all on function public.register_loss_damage_atomic(text,text,numeric,boolean,text,text,text) from public;
revoke all on function public.register_loss_damage_atomic(text,text,numeric,boolean,text,text,text) from anon;
grant execute on function public.register_loss_damage_atomic(text,text,numeric,boolean,text,text,text) to authenticated;
