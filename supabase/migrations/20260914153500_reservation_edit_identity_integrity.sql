-- Protege a integridade entre reserva, cadastro permanente e pre-check-in.
-- 1) Identidade nao pode ser trocada depois que o pre-check-in entrou em andamento/concluiu.
-- 2) Antes do pre-check-in, se nome/e-mail/telefone forem alterados e deixarem de corresponder
--    com seguranca ao guest_id atual, a reserva e desvinculada desse cadastro.

create or replace function public.update_reservation_atomic(
  p_reservation_id text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_check_in_date date,
  p_check_out_date date,
  p_adults integer,
  p_children integer,
  p_notes text default null::text
)
returns public.reservations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_res public.reservations%rowtype;
  v_room public.rooms%rowtype;
  v_guest public.guests%rowtype;
  v_hotel_date date := (timezone('America/Sao_Paulo', now()))::date;
  v_nights integer;
  v_identity_changed boolean := false;
  v_guest_link_safe boolean := false;
  v_has_comparable_contact boolean := false;
  v_new_guest_id text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para editar reservas.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status not in ('Pendente', 'Confirmada') then
    raise exception 'Somente reservas pendentes ou confirmadas podem ser editadas (status atual: %).', v_res.status;
  end if;

  if nullif(trim(coalesce(p_guest_name, '')), '') is null then
    raise exception 'Informe o nome do hóspede.';
  end if;

  if nullif(trim(coalesce(p_guest_email, '')), '') is null then
    raise exception 'Informe o e-mail do hóspede.';
  end if;

  if p_check_in_date is null or p_check_out_date is null or p_check_out_date <= p_check_in_date then
    raise exception 'A data de saída deve ser posterior à data de entrada.';
  end if;

  if p_check_out_date <= v_hotel_date then
    raise exception 'A saída da reserva deve ser posterior à data operacional atual (%).', to_char(v_hotel_date, 'DD/MM/YYYY');
  end if;

  if coalesce(p_adults, 0) < 1 or coalesce(p_children, 0) < 0 then
    raise exception 'A reserva deve ter ao menos 1 adulto e não pode ter quantidade negativa de crianças.';
  end if;

  v_identity_changed :=
    lower(trim(coalesce(p_guest_name, ''))) <> lower(trim(coalesce(v_res.guest_name, '')))
    or lower(trim(coalesce(p_guest_email, ''))) <> lower(trim(coalesce(v_res.guest_email, '')))
    or regexp_replace(coalesce(p_guest_phone, ''), '[^0-9]', '', 'g') <> regexp_replace(coalesce(v_res.guest_phone, ''), '[^0-9]', '', 'g');

  if v_identity_changed and coalesce(v_res.pre_checkin_status, 'NaoIniciado') in ('EmAndamento', 'Concluido') then
    raise exception 'A identidade do hóspede não pode ser alterada após o início do pré-check-in. Revise o pré-check-in antes de trocar o hóspede da reserva.';
  end if;

  if v_res.room_id is null then
    raise exception 'A reserva não possui quarto vinculado.';
  end if;

  select * into v_room
  from public.rooms
  where id = v_res.room_id;

  if not found then
    raise exception 'O quarto vinculado à reserva não foi encontrado.';
  end if;

  if (coalesce(p_adults, 0) + coalesce(p_children, 0)) > v_room.capacity then
    raise exception 'A ocupação informada (% hóspede(s)) excede a capacidade do quarto % (% hóspede(s)).',
      (coalesce(p_adults, 0) + coalesce(p_children, 0)), v_room.number, v_room.capacity;
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.id <> v_res.id
      and r.room_id = v_res.room_id
      and r.status in ('Pendente', 'Confirmada', 'CheckIn')
      and daterange(r.check_in_date, r.check_out_date, '[)') && daterange(p_check_in_date, p_check_out_date, '[)')
  ) then
    raise exception 'O quarto % possui outra reserva ativa no período informado.', v_room.number;
  end if;

  v_new_guest_id := v_res.guest_id;

  if v_identity_changed and v_res.guest_id is not null then
    select * into v_guest
    from public.guests
    where id = v_res.guest_id;

    if found then
      v_has_comparable_contact :=
        (nullif(trim(coalesce(v_guest.email, '')), '') is not null and nullif(trim(coalesce(p_guest_email, '')), '') is not null)
        or
        (nullif(regexp_replace(coalesce(v_guest.phone, ''), '[^0-9]', '', 'g'), '') is not null and nullif(regexp_replace(coalesce(p_guest_phone, ''), '[^0-9]', '', 'g'), '') is not null);

      v_guest_link_safe :=
        lower(trim(coalesce(v_guest.full_name, ''))) = lower(trim(coalesce(p_guest_name, '')))
        and (
          not v_has_comparable_contact
          or (
            nullif(trim(coalesce(v_guest.email, '')), '') is not null
            and nullif(trim(coalesce(p_guest_email, '')), '') is not null
            and lower(trim(v_guest.email)) = lower(trim(p_guest_email))
          )
          or (
            nullif(regexp_replace(coalesce(v_guest.phone, ''), '[^0-9]', '', 'g'), '') is not null
            and nullif(regexp_replace(coalesce(p_guest_phone, ''), '[^0-9]', '', 'g'), '') is not null
            and regexp_replace(v_guest.phone, '[^0-9]', '', 'g') = regexp_replace(p_guest_phone, '[^0-9]', '', 'g')
          )
        );
    end if;

    if not v_guest_link_safe then
      v_new_guest_id := null;
    end if;
  end if;

  v_nights := p_check_out_date - p_check_in_date;

  update public.reservations
  set guest_id = v_new_guest_id,
      guest_name = trim(p_guest_name),
      guest_email = trim(p_guest_email),
      guest_phone = trim(coalesce(p_guest_phone, '')),
      check_in_date = p_check_in_date,
      check_out_date = p_check_out_date,
      nights = v_nights,
      adults = p_adults,
      children = p_children,
      total_nights_amount = v_nights * price_per_night,
      notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$function$;
