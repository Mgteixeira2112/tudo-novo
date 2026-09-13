-- Preserva o documento informado no Motor de Reservas e o reaproveita no pré-check-in.
-- Também endurece a correspondência de identidade para não confiar em e-mail isolado.

alter table public.reservations
  add column if not exists guest_document text;

create or replace function public.create_reservation_atomic_v2(
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_guest_document text,
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
  v_res public.reservations%rowtype;
begin
  select * into v_res
  from public.create_reservation_atomic(
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_room_type_id,
    p_check_in_date,
    p_check_out_date,
    p_adults,
    p_children,
    p_payment_method,
    p_notes
  );

  update public.reservations
  set guest_document = nullif(trim(coalesce(p_guest_document, '')), '')
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

revoke all on function public.create_reservation_atomic_v2(text,text,text,text,text,date,date,integer,integer,text,text) from public;
grant execute on function public.create_reservation_atomic_v2(text,text,text,text,text,date,date,integer,integer,text,text) to anon, authenticated;

create or replace function public.get_reservation_precheckin_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_res public.reservations%rowtype;
  v_guest public.guests%rowtype;
begin
  if nullif(trim(coalesce(p_token, '')), '') is null then
    raise exception 'Link de pré-check-in inválido.';
  end if;

  select * into v_res
  from public.reservations
  where pre_checkin_token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and pre_checkin_token_expires_at > now()
    and status = 'Confirmada'
  limit 1;

  if not found then
    raise exception 'Link de pré-check-in inválido ou expirado.';
  end if;

  if v_res.guest_id is not null then
    select * into v_guest
    from public.guests g
    where g.id = v_res.guest_id
      and (
        (
          v_res.guest_document is not null
          and g.document is not null
          and trim(g.document) = trim(v_res.guest_document)
        )
        or (
          lower(trim(g.full_name)) = lower(trim(coalesce(v_res.guest_name, '')))
          and (
            (g.email is not null and v_res.guest_email is not null and lower(trim(g.email)) = lower(trim(v_res.guest_email)))
            or (g.phone is not null and v_res.guest_phone is not null and regexp_replace(g.phone, '\D', '', 'g') = regexp_replace(v_res.guest_phone, '\D', '', 'g'))
          )
        )
      )
    limit 1;
  end if;

  return jsonb_build_object(
    'reservation_code', v_res.code,
    'check_in_date', v_res.check_in_date,
    'check_out_date', v_res.check_out_date,
    'room_number', v_res.room_number,
    'pre_checkin_status', v_res.pre_checkin_status,
    'guest_name', coalesce(v_guest.full_name, v_res.guest_name, ''),
    'social_name', coalesce(v_guest.social_name, ''),
    'birth_date', v_guest.birth_date,
    'nationality', coalesce(v_guest.nationality, ''),
    'sex', coalesce(v_guest.sex, ''),
    'document_type', coalesce(v_guest.document_type, 'CPF'),
    'document', coalesce(v_guest.document, v_res.guest_document, ''),
    'email', coalesce(v_guest.email, v_res.guest_email, ''),
    'phone', coalesce(v_guest.phone, v_res.guest_phone, ''),
    'country', coalesce(v_guest.country, 'Brasil'),
    'state', coalesce(v_guest.state, ''),
    'city', coalesce(v_guest.city, ''),
    'address', coalesce(v_guest.address, ''),
    'address_complement', coalesce(v_guest.address_complement, ''),
    'district', coalesce(v_guest.district, ''),
    'postal_code', coalesce(v_guest.postal_code, ''),
    'travel_reason', coalesce(v_res.travel_reason, ''),
    'travel_origin', coalesce(v_res.travel_origin, ''),
    'next_destination', coalesce(v_res.next_destination, ''),
    'transport_mode', coalesce(v_res.transport_mode, ''),
    'vehicle_plate', coalesce(v_res.vehicle_plate, ''),
    'minors_count', coalesce(v_res.minors_count, 0),
    'legally_incapable_count', coalesce(v_res.legally_incapable_count, 0),
    'responsibility_notes', coalesce(v_res.responsibility_notes, ''),
    'completed_at', v_res.pre_checked_in_at
  );
end;
$$;

create or replace function public.complete_reservation_precheckin_public(
  p_token text,
  p_full_name text,
  p_social_name text,
  p_birth_date date,
  p_nationality text,
  p_sex text,
  p_document_type text,
  p_document text,
  p_email text,
  p_phone text,
  p_country text,
  p_state text,
  p_city text,
  p_address text,
  p_address_complement text,
  p_district text,
  p_postal_code text,
  p_travel_reason text,
  p_travel_origin text,
  p_next_destination text,
  p_transport_mode text,
  p_vehicle_plate text,
  p_minors_count integer,
  p_legally_incapable_count integer,
  p_responsibility_notes text,
  p_declaration_accepted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_res public.reservations%rowtype;
  v_guest public.guests%rowtype;
  v_guest_id text;
  v_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_document text := nullif(trim(coalesce(p_document, '')), '');
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  select * into v_res
  from public.reservations
  where pre_checkin_token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and pre_checkin_token_expires_at > now()
    and status = 'Confirmada'
  for update;

  if not found then
    raise exception 'Link de pré-check-in inválido ou expirado.';
  end if;

  if v_res.pre_checkin_status = 'Concluido' then
    return jsonb_build_object('status', 'Concluido', 'reservation_code', v_res.code, 'completed_at', v_res.pre_checked_in_at);
  end if;

  if v_name is null or p_birth_date is null
     or nullif(trim(coalesce(p_nationality, '')), '') is null
     or nullif(trim(coalesce(p_sex, '')), '') is null
     or nullif(trim(coalesce(p_document_type, '')), '') is null
     or v_document is null
     or v_email is null
     or v_phone is null
     or nullif(trim(coalesce(p_country, '')), '') is null
     or nullif(trim(coalesce(p_city, '')), '') is null
     or nullif(trim(coalesce(p_address, '')), '') is null
     or nullif(trim(coalesce(p_postal_code, '')), '') is null then
    raise exception 'Preencha todos os campos obrigatórios do pré-check-in.';
  end if;

  if coalesce(p_minors_count, 0) < 0 or coalesce(p_legally_incapable_count, 0) < 0 then
    raise exception 'As quantidades de menores/incapazes não podem ser negativas.';
  end if;

  if not coalesce(p_declaration_accepted, false) then
    raise exception 'É necessário confirmar a declaração do pré-check-in.';
  end if;

  if v_res.guest_id is not null then
    select * into v_guest
    from public.guests
    where id = v_res.guest_id;

    if found and (
      (v_guest.document is not null and trim(v_guest.document) = v_document)
      or (
        lower(trim(v_guest.full_name)) = lower(v_name)
        and (
          (v_guest.email is not null and lower(trim(v_guest.email)) = lower(v_email))
          or (v_guest.phone is not null and regexp_replace(v_guest.phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g'))
        )
      )
    ) then
      v_guest_id := v_guest.id;
    end if;
  end if;

  if v_guest_id is null then
    select id into v_guest_id
    from public.guests
    where (document is not null and trim(document) = v_document)
       or (
         lower(trim(full_name)) = lower(v_name)
         and (
           (email is not null and lower(trim(email)) = lower(v_email))
           or (phone is not null and regexp_replace(phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g'))
         )
       )
    order by created_at asc
    limit 1;
  end if;

  if v_guest_id is null then
    v_guest_id := 'guest_' || replace(gen_random_uuid()::text, '-', '');
    insert into public.guests (
      id, full_name, social_name, birth_date, nationality, sex,
      document_type, document, email, phone, country, state, city,
      address, address_complement, district, postal_code, status
    ) values (
      v_guest_id, v_name, nullif(trim(coalesce(p_social_name, '')), ''), p_birth_date,
      trim(p_nationality), trim(p_sex), trim(p_document_type), v_document,
      v_email, v_phone, trim(p_country), nullif(trim(coalesce(p_state, '')), ''),
      trim(p_city), trim(p_address), nullif(trim(coalesce(p_address_complement, '')), ''),
      nullif(trim(coalesce(p_district, '')), ''), trim(p_postal_code), 'Ativo'
    );
  else
    update public.guests
    set full_name = v_name,
        social_name = nullif(trim(coalesce(p_social_name, '')), ''),
        birth_date = p_birth_date,
        nationality = trim(p_nationality),
        sex = trim(p_sex),
        document_type = trim(p_document_type),
        document = v_document,
        email = v_email,
        phone = v_phone,
        country = trim(p_country),
        state = nullif(trim(coalesce(p_state, '')), ''),
        city = trim(p_city),
        address = trim(p_address),
        address_complement = nullif(trim(coalesce(p_address_complement, '')), ''),
        district = nullif(trim(coalesce(p_district, '')), ''),
        postal_code = trim(p_postal_code),
        updated_at = now()
    where id = v_guest_id;
  end if;

  update public.reservations
  set guest_id = v_guest_id,
      guest_name = v_name,
      guest_email = v_email,
      guest_phone = v_phone,
      guest_document = v_document,
      travel_reason = nullif(trim(coalesce(p_travel_reason, '')), ''),
      travel_origin = nullif(trim(coalesce(p_travel_origin, '')), ''),
      next_destination = nullif(trim(coalesce(p_next_destination, '')), ''),
      transport_mode = nullif(trim(coalesce(p_transport_mode, '')), ''),
      vehicle_plate = nullif(trim(coalesce(p_vehicle_plate, '')), ''),
      minors_count = coalesce(p_minors_count, 0),
      legally_incapable_count = coalesce(p_legally_incapable_count, 0),
      responsibility_notes = nullif(trim(coalesce(p_responsibility_notes, '')), ''),
      pre_checkin_status = 'Concluido',
      pre_checkin_updated_at = now(),
      pre_checked_in_at = now(),
      terms_accepted_at = now(),
      terms_version = 'precheckin-declaration-v1'
  where id = v_res.id;

  return jsonb_build_object(
    'status', 'Concluido',
    'reservation_code', v_res.code,
    'guest_id', v_guest_id,
    'completed_at', now()
  );
end;
$$;

revoke all on function public.get_reservation_precheckin_public(text) from public;
grant execute on function public.get_reservation_precheckin_public(text) to anon, authenticated;

revoke all on function public.complete_reservation_precheckin_public(text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean) from public;
grant execute on function public.complete_reservation_precheckin_public(text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean) to anon, authenticated;
