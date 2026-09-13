create or replace function public.create_guest_from_reservation_and_link(
  p_reservation_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_res public.reservations%rowtype;
  v_guest_id text;
  v_document text;
  v_document_type text;
  v_total_stays integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_guests')
  ) then
    raise exception 'Permissão insuficiente para criar cadastro a partir da reserva.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.guest_id is not null then
    raise exception 'Esta reserva já possui cadastro de hóspede vinculado.';
  end if;

  if nullif(trim(coalesce(v_res.guest_name, '')), '') is null then
    raise exception 'A reserva não possui nome de hóspede suficiente para criar o cadastro.';
  end if;

  v_document := nullif(trim(coalesce(v_res.guest_document, '')), '');
  v_document_type := case
    when length(regexp_replace(coalesce(v_document, ''), '[^0-9]', '', 'g')) = 11 then 'CPF'
    else null
  end;

  if exists (
    select 1
    from public.guests g
    where
      (
        v_document is not null
        and nullif(trim(coalesce(g.document, '')), '') is not null
        and regexp_replace(g.document, '[^0-9A-Za-z]', '', 'g') = regexp_replace(v_document, '[^0-9A-Za-z]', '', 'g')
      )
      or (
        lower(trim(g.full_name)) = lower(trim(v_res.guest_name))
        and (
          (
            nullif(trim(coalesce(g.email, '')), '') is not null
            and nullif(trim(coalesce(v_res.guest_email, '')), '') is not null
            and lower(trim(g.email)) = lower(trim(v_res.guest_email))
          )
          or (
            nullif(regexp_replace(coalesce(g.phone, ''), '[^0-9]', '', 'g'), '') is not null
            and nullif(regexp_replace(coalesce(v_res.guest_phone, ''), '[^0-9]', '', 'g'), '') is not null
            and regexp_replace(g.phone, '[^0-9]', '', 'g') = regexp_replace(v_res.guest_phone, '[^0-9]', '', 'g')
          )
        )
      )
  ) then
    raise exception 'Já existe um cadastro compatível com esta reserva. Use a vinculação a cadastro existente para evitar duplicidade.';
  end if;

  v_guest_id := 'guest_' || replace(gen_random_uuid()::text, '-', '');
  v_total_stays := case when v_res.status in ('CheckIn', 'CheckOut') then 1 else 0 end;

  insert into public.guests (
    id,
    full_name,
    document,
    document_type,
    email,
    phone,
    status,
    total_stays,
    total_spent
  ) values (
    v_guest_id,
    trim(v_res.guest_name),
    v_document,
    v_document_type,
    nullif(trim(coalesce(v_res.guest_email, '')), ''),
    nullif(trim(coalesce(v_res.guest_phone, '')), ''),
    'Ativo',
    v_total_stays,
    0
  );

  update public.reservations
  set guest_id = v_guest_id
  where id = v_res.id;

  return jsonb_build_object(
    'reservationId', v_res.id,
    'reservationCode', v_res.code,
    'guestId', v_guest_id,
    'guestName', trim(v_res.guest_name),
    'totalStays', v_total_stays
  );
end;
$function$;

revoke all on function public.create_guest_from_reservation_and_link(text) from public, anon;
grant execute on function public.create_guest_from_reservation_and_link(text) to authenticated;
