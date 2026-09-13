-- Link público seguro para pré-check-in.
-- O token bruto nunca é persistido: somente SHA-256.

alter table public.reservations
  add column if not exists pre_checkin_token_hash text,
  add column if not exists pre_checkin_token_issued_at timestamptz,
  add column if not exists pre_checkin_token_expires_at timestamptz;

create index if not exists reservations_pre_checkin_token_hash_idx
  on public.reservations(pre_checkin_token_hash)
  where pre_checkin_token_hash is not null;

create or replace function public.issue_reservation_precheckin_link(p_reservation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_res public.reservations%rowtype;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para gerar link de pré-check-in.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status <> 'Confirmada' then
    raise exception 'O link de pré-check-in só pode ser gerado para reserva confirmada.';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := least(
    now() + interval '30 days',
    ((v_res.check_in_date + 1)::timestamp at time zone 'America/Sao_Paulo')
  );

  if v_expires_at <= now() then
    v_expires_at := now() + interval '24 hours';
  end if;

  update public.reservations
  set pre_checkin_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      pre_checkin_token_issued_at = now(),
      pre_checkin_token_expires_at = v_expires_at,
      pre_checkin_updated_at = coalesce(pre_checkin_updated_at, now())
  where id = v_res.id;

  return jsonb_build_object(
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

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
    select * into v_guest from public.guests where id = v_res.guest_id;
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
    'document', coalesce(v_guest.document, ''),
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
     or nullif(trim(coalesce(p_phone, '')), '') is null
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

  -- Reutiliza o vínculo atual somente quando ele é coerente com nome/e-mail/documento.
  if v_res.guest_id is not null then
    select * into v_guest from public.guests where id = v_res.guest_id;
    if found and (
      lower(trim(v_guest.full_name)) = lower(v_name)
      or (v_guest.email is not null and lower(trim(v_guest.email)) = lower(v_email))
      or (v_guest.document is not null and trim(v_guest.document) = v_document)
    ) then
      v_guest_id := v_guest.id;
    end if;
  end if;

  -- Procura cadastro existente por documento; como fallback, nome + e-mail.
  if v_guest_id is null then
    select id into v_guest_id
    from public.guests
    where (document is not null and trim(document) = v_document)
       or (lower(trim(full_name)) = lower(v_name) and email is not null and lower(trim(email)) = lower(v_email))
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
      v_email, trim(p_phone), trim(p_country), nullif(trim(coalesce(p_state, '')), ''),
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
        phone = trim(p_phone),
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
      guest_phone = trim(p_phone),
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

revoke all on function public.issue_reservation_precheckin_link(text) from public, anon;
grant execute on function public.issue_reservation_precheckin_link(text) to authenticated;

revoke all on function public.get_reservation_precheckin_public(text) from public;
grant execute on function public.get_reservation_precheckin_public(text) to anon, authenticated;

revoke all on function public.complete_reservation_precheckin_public(text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean) from public;
grant execute on function public.complete_reservation_precheckin_public(text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,boolean) to anon, authenticated;
