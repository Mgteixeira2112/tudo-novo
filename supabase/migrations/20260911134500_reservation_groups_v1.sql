-- Govermix: reserva agrupada de 2 ou 3 quartos em uma única transação.
-- Mantém cada quarto como uma reserva operacional independente, mas adiciona
-- um identificador compartilhado para representar a compra/grupo no motor.

alter table public.reservations
  add column if not exists group_id text,
  add column if not exists group_code text,
  add column if not exists group_index integer,
  add column if not exists group_size integer;

create index if not exists reservations_group_id_idx
  on public.reservations(group_id)
  where group_id is not null;

create or replace function public.create_reservation_group_atomic(
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_check_in_date date,
  p_check_out_date date,
  p_total_adults integer,
  p_total_children integer,
  p_payment_method text,
  p_allocations jsonb,
  p_notes text default null
)
returns setof public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nights integer;
  v_now timestamptz := now();
  v_group_id text := 'grp_' || replace(gen_random_uuid()::text, '-', '');
  v_group_code text := 'GR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_group_size integer;
  v_sum_adults integer;
  v_sum_children integer;
  v_item jsonb;
  v_type_id text;
  v_alloc_adults integer;
  v_alloc_children integer;
  v_room_type jsonb;
  v_max_adults integer;
  v_max_children integer;
  v_max_occupancy integer;
  v_room public.rooms%rowtype;
  v_res public.reservations%rowtype;
  v_index integer := 0;
  v_reservation_id text;
  v_reservation_code text;
  v_lock_type text;
begin
  if p_guest_name is null or length(trim(p_guest_name)) < 2 or length(trim(p_guest_name)) > 120 then
    raise exception 'Nome do hóspede inválido.' using errcode = '22023';
  end if;
  if p_guest_email is null or length(trim(p_guest_email)) > 254 or position('@' in p_guest_email) < 2 then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if p_guest_phone is null or length(trim(p_guest_phone)) < 5 or length(trim(p_guest_phone)) > 40 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if p_check_in_date is null or p_check_out_date is null or p_check_out_date <= p_check_in_date then
    raise exception 'Período da reserva inválido.' using errcode = '22023';
  end if;

  v_nights := p_check_out_date - p_check_in_date;
  if v_nights < 1 or v_nights > 60 then
    raise exception 'O período da reserva deve ter entre 1 e 60 noites.' using errcode = '22023';
  end if;
  if coalesce(p_total_adults, 0) < 1 or p_total_adults > 20 or coalesce(p_total_children, 0) < 0 or p_total_children > 20 then
    raise exception 'Quantidade total de hóspedes inválida.' using errcode = '22023';
  end if;
  if p_payment_method not in ('PIX','Cartao_Credito','Cartao_Debito','Dinheiro') then
    raise exception 'Forma de pagamento não permitida.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'INVALID_ALLOCATION: distribuições inválidas.' using errcode = '22023';
  end if;

  v_group_size := jsonb_array_length(p_allocations);
  if v_group_size < 2 or v_group_size > 3 then
    raise exception 'INVALID_ALLOCATION: a reserva agrupada deve conter 2 ou 3 quartos.' using errcode = '22023';
  end if;

  select
    coalesce(sum(greatest(0, coalesce(nullif(item->>'adults','')::integer, 0))), 0),
    coalesce(sum(greatest(0, coalesce(nullif(item->>'children','')::integer, 0))), 0)
  into v_sum_adults, v_sum_children
  from jsonb_array_elements(p_allocations) item;

  if v_sum_adults <> p_total_adults or v_sum_children <> p_total_children then
    raise exception 'INVALID_ALLOCATION: a soma dos hóspedes não corresponde à busca.' using errcode = '22023';
  end if;

  -- Usa os mesmos advisory locks da reserva individual, em ordem determinística,
  -- para impedir corrida entre uma reserva simples e uma reserva agrupada.
  for v_lock_type in
    select distinct item->>'roomTypeId'
    from jsonb_array_elements(p_allocations) item
    where coalesce(item->>'roomTypeId', '') <> ''
    order by 1
  loop
    perform pg_advisory_xact_lock(hashtextextended('reservation:' || v_lock_type, 0));
  end loop;

  -- Valida todas as distribuições antes de inserir qualquer reserva.
  for v_item in select value from jsonb_array_elements(p_allocations)
  loop
    v_type_id := nullif(trim(v_item->>'roomTypeId'), '');
    v_alloc_adults := greatest(0, coalesce(nullif(v_item->>'adults','')::integer, 0));
    v_alloc_children := greatest(0, coalesce(nullif(v_item->>'children','')::integer, 0));

    if v_type_id is null or (v_alloc_adults + v_alloc_children) < 1 then
      raise exception 'INVALID_ALLOCATION: quarto sem hóspedes ou tipo inválido.' using errcode = '22023';
    end if;

    select elem into v_room_type
    from public.hotel_settings hs
    cross join lateral jsonb_array_elements(coalesce(hs.room_types, '[]'::jsonb)) elem
    where elem->>'id' = v_type_id
    order by hs.id
    limit 1;

    if v_room_type is null then
      raise exception 'INVALID_ALLOCATION: tipo de acomodação não encontrado.' using errcode = '22023';
    end if;

    v_max_adults := greatest(0, coalesce(nullif(v_room_type->>'capacityAdults','')::integer, 0));
    v_max_children := greatest(0, coalesce(nullif(v_room_type->>'capacityChildren','')::integer, 0));
    v_max_occupancy := greatest(1, coalesce(nullif(v_room_type->>'maxOccupancy','')::integer, v_max_adults + v_max_children));

    if v_alloc_adults > v_max_adults
       or v_alloc_children > v_max_children
       or (v_alloc_adults + v_alloc_children) > v_max_occupancy then
      raise exception 'INVALID_ALLOCATION: distribuição excede a capacidade de uma acomodação.' using errcode = '22023';
    end if;
  end loop;

  -- Seleciona e insere cada quarto dentro da mesma transação.
  for v_item in select value from jsonb_array_elements(p_allocations)
  loop
    v_index := v_index + 1;
    v_type_id := trim(v_item->>'roomTypeId');
    v_alloc_adults := greatest(0, coalesce(nullif(v_item->>'adults','')::integer, 0));
    v_alloc_children := greatest(0, coalesce(nullif(v_item->>'children','')::integer, 0));

    select r.* into v_room
    from public.rooms r
    where r.type_id = v_type_id
      and r.status not in ('Manutencao','Bloqueado')
      and not exists (
        select 1
        from public.reservations x
        where x.room_id = r.id
          and x.status in ('Pendente','Confirmada','CheckIn')
          and daterange(x.check_in_date, x.check_out_date, '[)') && daterange(p_check_in_date, p_check_out_date, '[)')
      )
    order by r.number
    for update of r skip locked
    limit 1;

    if v_room.id is null then
      raise exception 'ROOM_UNAVAILABLE: uma das acomodações deixou de estar disponível.' using errcode = 'P0001';
    end if;

    v_reservation_id := 'res_' || replace(gen_random_uuid()::text, '-', '');
    v_reservation_code := v_group_code || '-' || v_index::text;

    insert into public.reservations (
      id, code, guest_id, guest_name, guest_email, guest_phone,
      room_id, room_number, room_type_name, check_in_date, check_out_date,
      nights, adults, children, price_per_night, total_nights_amount,
      status, payment_status, payment_method, notes, created_at,
      group_id, group_code, group_index, group_size
    ) values (
      v_reservation_id, v_reservation_code, null, trim(p_guest_name), lower(trim(p_guest_email)), trim(p_guest_phone),
      v_room.id, v_room.number, v_room.type_name, p_check_in_date, p_check_out_date,
      v_nights, v_alloc_adults, v_alloc_children, v_room.price_per_night, v_room.price_per_night * v_nights,
      'Pendente', 'Pendente', p_payment_method, nullif(trim(coalesce(p_notes,'')),''), v_now,
      v_group_id, v_group_code, v_index, v_group_size
    ) returning * into v_res;

    return next v_res;
  end loop;

  return;
end;
$$;

revoke all on function public.create_reservation_group_atomic(text,text,text,date,date,integer,integer,text,jsonb,text) from public;
grant execute on function public.create_reservation_group_atomic(text,text,text,date,date,integer,integer,text,jsonb,text) to anon, authenticated;
