-- Govermix: capacidade comercial desacoplada da coluna legada rooms.capacity.
-- A disponibilidade por data passa a ser consultada separadamente da compatibilidade
-- de hóspedes/camas, que é calculada pelo motor a partir de hotel_settings.room_types.

create or replace function public.get_available_room_types_v2(
  p_check_in date,
  p_check_out date
)
returns table(type_id text, available_count bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'INVALID_DATES';
  end if;

  return query
  select r.type_id, count(*)::bigint
  from public.rooms r
  where r.type_id is not null
    and r.status not in ('Manutencao', 'Bloqueado')
    and not exists (
      select 1
      from public.reservations res
      where res.room_id = r.id
        and res.status = any(array['Pendente','Confirmada','CheckIn'])
        and daterange(res.check_in_date, res.check_out_date, '[)') && daterange(p_check_in, p_check_out, '[)')
    )
  group by r.type_id
  order by r.type_id;
end;
$$;

revoke all on function public.get_available_room_types_v2(date,date) from public;
grant execute on function public.get_available_room_types_v2(date,date) to anon, authenticated;

create or replace function public.create_reservation_atomic(
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_room_type_id text,
  p_check_in_date date,
  p_check_out_date date,
  p_adults integer,
  p_children integer,
  p_payment_method text,
  p_notes text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_res public.reservations%rowtype;
  v_nights integer;
  v_now timestamptz := now();
  v_id text;
  v_code text;
  v_room_type jsonb;
  v_max_adults integer;
  v_max_children integer;
  v_max_occupancy integer;
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
  if p_room_type_id is null or length(trim(p_room_type_id)) = 0 then
    raise exception 'Tipo de quarto inválido.' using errcode = '22023';
  end if;
  if p_check_in_date is null or p_check_out_date is null or p_check_out_date <= p_check_in_date then
    raise exception 'Período da reserva inválido.' using errcode = '22023';
  end if;

  v_nights := p_check_out_date - p_check_in_date;
  if v_nights < 1 or v_nights > 60 then
    raise exception 'O período da reserva deve ter entre 1 e 60 noites.' using errcode = '22023';
  end if;
  if p_adults < 1 or p_adults > 10 or p_children < 0 or p_children > 10 then
    raise exception 'Quantidade de hóspedes inválida.' using errcode = '22023';
  end if;
  if p_payment_method not in ('PIX','Cartao_Credito','Cartao_Debito','Dinheiro') then
    raise exception 'Forma de pagamento não permitida.' using errcode = '22023';
  end if;

  select elem
    into v_room_type
  from public.hotel_settings hs
  cross join lateral jsonb_array_elements(coalesce(hs.room_types, '[]'::jsonb)) elem
  where elem->>'id' = p_room_type_id
  order by hs.id
  limit 1;

  if v_room_type is null then
    raise exception 'Tipo de acomodação não encontrado.' using errcode = '22023';
  end if;

  v_max_adults := greatest(0, coalesce(nullif(v_room_type->>'capacityAdults','')::integer, 0));
  v_max_children := greatest(0, coalesce(nullif(v_room_type->>'capacityChildren','')::integer, 0));
  v_max_occupancy := greatest(
    1,
    coalesce(
      nullif(v_room_type->>'maxOccupancy','')::integer,
      v_max_adults + v_max_children
    )
  );

  if p_adults > v_max_adults then
    raise exception 'A acomodação aceita no máximo % adulto(s).', v_max_adults using errcode = '22023';
  end if;
  if p_children > v_max_children then
    raise exception 'A acomodação aceita no máximo % criança(s).', v_max_children using errcode = '22023';
  end if;
  if (p_adults + p_children) > v_max_occupancy then
    raise exception 'A ocupação comercial máxima desta acomodação é de % hóspede(s).', v_max_occupancy using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reservation:' || p_room_type_id, 0));

  select r.* into v_room
  from public.rooms r
  where r.type_id = p_room_type_id
    and r.status not in ('Manutencao','Bloqueado')
    and not exists (
      select 1 from public.reservations x
      where x.room_id = r.id
        and x.status in ('Pendente','Confirmada','CheckIn')
        and daterange(x.check_in_date, x.check_out_date, '[)') && daterange(p_check_in_date, p_check_out_date, '[)')
    )
  order by r.number
  for update of r skip locked
  limit 1;

  if v_room.id is null then
    raise exception 'Não há quarto disponível para este tipo e período.' using errcode = 'P0001';
  end if;

  v_id := 'res_' || replace(gen_random_uuid()::text, '-', '');
  v_code := 'NH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.reservations (
    id, code, guest_id, guest_name, guest_email, guest_phone,
    room_id, room_number, room_type_name, check_in_date, check_out_date,
    nights, adults, children, price_per_night, total_nights_amount,
    status, payment_status, payment_method, notes, created_at
  ) values (
    v_id, v_code, null, trim(p_guest_name), lower(trim(p_guest_email)), trim(p_guest_phone),
    v_room.id, v_room.number, v_room.type_name, p_check_in_date, p_check_out_date,
    v_nights, p_adults, p_children, v_room.price_per_night, v_room.price_per_night * v_nights,
    'Pendente', 'Pendente', p_payment_method, nullif(trim(coalesce(p_notes,'')),''), v_now
  ) returning * into v_res;

  return v_res;
end;
$$;

revoke all on function public.create_reservation_atomic(text,text,text,text,date,date,integer,integer,text,text) from public;
grant execute on function public.create_reservation_atomic(text,text,text,text,date,date,integer,integer,text,text) to anon, authenticated;
