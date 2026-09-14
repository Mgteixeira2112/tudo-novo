-- Govermix — criação de reserva interna a partir da grade de ocupação.
-- Mantém o motor público intacto e permite que a Recepção escolha um quarto exato.

create or replace function public.create_reservation_for_room_atomic(
  p_room_id text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_guest_document text,
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
  v_room_type jsonb;
  v_hotel_date date := (timezone('America/Sao_Paulo', now()))::date;
  v_nights integer;
  v_max_adults integer;
  v_max_children integer;
  v_max_occupancy integer;
  v_id text;
  v_code text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para criar reserva pela grade.' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_room_id, '')), '') is null then
    raise exception 'Quarto inválido.' using errcode = '22023';
  end if;
  if p_guest_name is null or length(trim(p_guest_name)) < 2 or length(trim(p_guest_name)) > 120 then
    raise exception 'Nome do hóspede inválido.' using errcode = '22023';
  end if;
  if p_guest_email is null or length(trim(p_guest_email)) > 254 or position('@' in p_guest_email) < 2 then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if p_guest_phone is null or length(trim(p_guest_phone)) < 5 or length(trim(p_guest_phone)) > 40 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if p_guest_document is not null and length(trim(p_guest_document)) > 60 then
    raise exception 'Documento inválido.' using errcode = '22023';
  end if;
  if p_check_in_date is null or p_check_out_date is null or p_check_out_date <= p_check_in_date then
    raise exception 'Período da reserva inválido.' using errcode = '22023';
  end if;
  if p_check_in_date < v_hotel_date then
    raise exception 'PAST_CHECKIN';
  end if;

  v_nights := p_check_out_date - p_check_in_date;
  if v_nights < 1 or v_nights > 60 then
    raise exception 'O período da reserva deve ter entre 1 e 60 noites.' using errcode = '22023';
  end if;
  if p_adults is null or p_children is null or p_adults < 1 or p_adults > 10 or p_children < 0 or p_children > 10 then
    raise exception 'Quantidade de hóspedes inválida.' using errcode = '22023';
  end if;
  if p_payment_method not in ('PIX','Cartao_Credito','Cartao_Debito','Dinheiro') then
    raise exception 'Forma de pagamento não permitida.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reservation-room:' || p_room_id, 0));

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'Quarto não encontrado.';
  end if;

  if v_room.status in ('Manutencao', 'Bloqueado') then
    raise exception 'ROOM_BLOCKED';
  end if;

  if v_room.type_id is null then
    raise exception 'O quarto não possui categoria configurada.';
  end if;

  select elem
    into v_room_type
  from public.hotel_settings hs
  cross join lateral jsonb_array_elements(coalesce(hs.room_types, '[]'::jsonb)) elem
  where elem->>'id' = v_room.type_id
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

  if exists (
    select 1
    from public.reservations r
    where r.room_id = v_room.id
      and r.status in ('Pendente', 'Confirmada', 'CheckIn')
      and daterange(r.check_in_date, r.check_out_date, '[)') && daterange(p_check_in_date, p_check_out_date, '[)')
  ) then
    raise exception 'ROOM_UNAVAILABLE';
  end if;

  v_id := 'res_' || replace(gen_random_uuid()::text, '-', '');
  v_code := 'NH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.reservations (
    id, code, guest_id, guest_name, guest_email, guest_phone, guest_document,
    room_id, room_number, room_type_name, check_in_date, check_out_date,
    nights, adults, children, price_per_night, total_nights_amount,
    status, payment_status, payment_method, notes, created_at
  ) values (
    v_id, v_code, null, trim(p_guest_name), lower(trim(p_guest_email)), trim(p_guest_phone), nullif(trim(coalesce(p_guest_document, '')), ''),
    v_room.id, v_room.number, v_room.type_name, p_check_in_date, p_check_out_date,
    v_nights, p_adults, p_children, v_room.price_per_night, v_room.price_per_night * v_nights,
    'Confirmada', 'Pendente', p_payment_method, nullif(trim(coalesce(p_notes, '')), ''), now()
  )
  returning * into v_res;

  return v_res;
exception
  when exclusion_violation then
    raise exception 'ROOM_UNAVAILABLE';
end;
$$;

revoke all on function public.create_reservation_for_room_atomic(text,text,text,text,text,date,date,integer,integer,text,text) from public;
revoke all on function public.create_reservation_for_room_atomic(text,text,text,text,text,date,date,integer,integer,text,text) from anon;
grant execute on function public.create_reservation_for_room_atomic(text,text,text,text,text,date,date,integer,integer,text,text) to authenticated;

comment on function public.create_reservation_for_room_atomic(text,text,text,text,text,date,date,integer,integer,text,text) is
  'Cria reserva Confirmada pela equipe interna para um quarto exato, revalidando permissão, capacidade comercial e conflito de período de forma atômica.';
