create or replace function public.find_overdue_stay_transfer_rooms(
  p_reservation_id text,
  p_new_check_out_date date
)
returns table (
  id text,
  number text,
  type_id text,
  type_name text,
  floor integer,
  capacity integer,
  price_per_night numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_current_room public.rooms%rowtype;
  v_hotel_date date := (timezone('America/Sao_Paulo', now()))::date;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_users s
    where s.id = auth.uid() and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para consultar quartos para transferência.' using errcode = '42501';
  end if;

  select * into v_res from public.reservations where reservations.id = p_reservation_id;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if v_res.status <> 'CheckIn' or v_res.room_id is null then
    raise exception 'A reserva não possui uma hospedagem ativa para transferência.';
  end if;

  select * into v_current_room from public.rooms where rooms.id = v_res.room_id;
  if not found then raise exception 'Quarto atual não encontrado.'; end if;

  if p_new_check_out_date is null or p_new_check_out_date <= v_hotel_date then
    raise exception 'A nova saída deve ser posterior à data operacional atual.';
  end if;

  return query
  select r.id, r.number, r.type_id, r.type_name, r.floor, r.capacity, r.price_per_night
  from public.rooms r
  cross join lateral (
    select elem
    from public.hotel_settings hs
    cross join lateral jsonb_array_elements(coalesce(hs.room_types, '[]'::jsonb)) elem
    where elem->>'id' = r.type_id
    order by hs.id
    limit 1
  ) rt
  where r.id <> v_current_room.id
    and r.status = 'Disponivel'
    and coalesce(nullif(rt.elem->>'capacityAdults','')::integer, 0) >= coalesce(v_res.adults, 0)
    and coalesce(nullif(rt.elem->>'capacityChildren','')::integer, 0) >= coalesce(v_res.children, 0)
    and coalesce(
      nullif(rt.elem->>'maxOccupancy','')::integer,
      coalesce(nullif(rt.elem->>'capacityAdults','')::integer, 0) + coalesce(nullif(rt.elem->>'capacityChildren','')::integer, 0)
    ) >= (coalesce(v_res.adults, 0) + coalesce(v_res.children, 0))
    and not exists (
      select 1 from public.reservations x
      where x.room_id = r.id
        and x.status in ('Pendente', 'Confirmada', 'CheckIn')
        and daterange(x.check_in_date, x.check_out_date, '[)') && daterange(v_hotel_date, p_new_check_out_date, '[)')
    )
  order by
    case when r.type_id = v_current_room.type_id then 0 else 1 end,
    r.price_per_night,
    r.number;
end;
$$;

create or replace function public.extend_overdue_stay_with_transfer_atomic(
  p_reservation_id text,
  p_new_check_out_date date,
  p_new_room_id text,
  p_reason text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_old_room public.rooms%rowtype;
  v_new_room public.rooms%rowtype;
  v_new_type jsonb;
  v_hotel_date date := (timezone('America/Sao_Paulo', now()))::date;
  v_nights integer;
  v_note text;
  v_max_adults integer;
  v_max_children integer;
  v_max_occupancy integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_users s
    where s.id = auth.uid() and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para transferir hospedagem.' using errcode = '42501';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if v_res.status <> 'CheckIn' then raise exception 'Somente hospedagens em Check-in podem ser transferidas.'; end if;
  if v_res.room_id is null then raise exception 'A hospedagem não possui quarto vinculado.'; end if;

  select * into v_old_room from public.rooms where id = v_res.room_id for update;
  if not found then raise exception 'Quarto atual não encontrado.'; end if;
  if v_old_room.current_reservation_id is distinct from v_res.id then
    raise exception 'O quarto atual não está mais vinculado a esta hospedagem.';
  end if;

  if p_new_check_out_date is null or p_new_check_out_date <= v_hotel_date then
    raise exception 'A nova saída deve ser posterior à data operacional atual (%).', to_char(v_hotel_date, 'DD/MM/YYYY');
  end if;
  if p_new_check_out_date <= v_res.check_out_date then
    raise exception 'A nova saída deve ser posterior à saída atual (%).', to_char(v_res.check_out_date, 'DD/MM/YYYY');
  end if;

  select * into v_new_room from public.rooms where id = p_new_room_id for update;
  if not found then raise exception 'Novo quarto não encontrado.'; end if;
  if v_new_room.id = v_old_room.id then raise exception 'Selecione um quarto diferente do atual.'; end if;
  if v_new_room.status <> 'Disponivel' then raise exception 'O quarto % não está disponível para transferência.', v_new_room.number; end if;

  select elem into v_new_type
  from public.hotel_settings hs
  cross join lateral jsonb_array_elements(coalesce(hs.room_types, '[]'::jsonb)) elem
  where elem->>'id' = v_new_room.type_id
  order by hs.id
  limit 1;

  if v_new_type is null then raise exception 'Tipo de acomodação do novo quarto não encontrado.'; end if;

  v_max_adults := greatest(0, coalesce(nullif(v_new_type->>'capacityAdults','')::integer, 0));
  v_max_children := greatest(0, coalesce(nullif(v_new_type->>'capacityChildren','')::integer, 0));
  v_max_occupancy := greatest(1, coalesce(nullif(v_new_type->>'maxOccupancy','')::integer, v_max_adults + v_max_children));

  if coalesce(v_res.adults,0) > v_max_adults
     or coalesce(v_res.children,0) > v_max_children
     or (coalesce(v_res.adults,0) + coalesce(v_res.children,0)) > v_max_occupancy then
    raise exception 'O quarto % não comporta a ocupação atual da hospedagem.', v_new_room.number;
  end if;

  if exists (
    select 1 from public.reservations x
    where x.room_id = v_new_room.id
      and x.status in ('Pendente', 'Confirmada', 'CheckIn')
      and daterange(x.check_in_date, x.check_out_date, '[)') && daterange(v_hotel_date, p_new_check_out_date, '[)')
  ) then
    raise exception 'O quarto % recebeu outra reserva no período. Atualize as opções e tente novamente.', v_new_room.number;
  end if;

  v_nights := p_new_check_out_date - v_res.check_in_date;
  v_note := concat(
    'Transferência do quarto ', v_old_room.number, ' para o quarto ', v_new_room.number,
    ' (', v_new_room.type_name, ') com prorrogação até ', to_char(p_new_check_out_date, 'DD/MM/YYYY'),
    '. Tarifa original preservada',
    case when nullif(trim(coalesce(p_reason, '')), '') is null then '.' else '. Motivo: ' || trim(p_reason) end
  );

  update public.reservations
  set room_id = v_new_room.id,
      room_number = v_new_room.number,
      room_type_name = v_new_room.type_name,
      check_out_date = p_new_check_out_date,
      nights = v_nights,
      total_nights_amount = v_nights * price_per_night,
      notes = concat_ws(E'\n', nullif(notes, ''), v_note)
  where id = v_res.id
  returning * into v_res;

  update public.rooms
  set status = 'Limpeza', current_reservation_id = null, current_guest_name = null,
      notes = 'Aguardando higienização após transferência de ' || v_res.guest_name || ' para o quarto ' || v_new_room.number || '.'
  where id = v_old_room.id;

  update public.rooms
  set status = 'Ocupado', current_reservation_id = v_res.id, current_guest_name = v_res.guest_name,
      notes = 'Hóspede transferido do quarto ' || v_old_room.number || '. Saída prevista em ' || to_char(p_new_check_out_date, 'DD/MM/YYYY') || '. Tarifa original da reserva preservada.'
  where id = v_new_room.id;

  update public.kitchen_orders
  set room_id = v_new_room.id, room_number = v_new_room.number
  where reservation_id = v_res.id and status not in ('Entregue', 'Cancelado');

  update public.kanban_tasks
  set room_number = v_new_room.number, updated_at = now()
  where related_type = 'Reserva' and related_id = v_res.id and status <> 'Concluido';

  insert into public.kanban_tasks(
    id,title,description,sector,status,priority,room_number,guest_name,related_type,related_id,created_at,updated_at
  ) values (
    'task_' || replace(gen_random_uuid()::text, '-', ''),
    'Higienização após transferência - Quarto ' || v_old_room.number,
    'Hóspede ' || v_res.guest_name || ' transferido para o quarto ' || v_new_room.number || '. Priorizar limpeza e liberação do quarto anterior.',
    'Governanca','A_Fazer','Urgente',v_old_room.number,v_res.guest_name,'Reserva',v_res.id,now(),now()
  );

  delete from public.operational_notifications
  where type = 'reception_overstay' and source_type = 'Reserva' and source_id = v_res.id;

  return v_res;
end;
$$;