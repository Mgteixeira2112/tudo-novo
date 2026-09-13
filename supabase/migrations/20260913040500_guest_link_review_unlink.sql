create or replace function public.unlink_inconsistent_reservation_guest(
  p_reservation_id text,
  p_expected_guest_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_res public.reservations%rowtype;
  v_guest public.guests%rowtype;
  v_has_comparable_contact boolean := false;
  v_link_safe boolean := false;
  v_total_stays integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_guests')
  ) then
    raise exception 'Permissão insuficiente para revisar vínculo de hóspede.' using errcode = '42501';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.guest_id is null then
    raise exception 'Esta reserva já não possui cadastro de hóspede vinculado.';
  end if;

  if v_res.guest_id is distinct from p_expected_guest_id then
    raise exception 'O vínculo da reserva mudou. Atualize a tela antes de revisar.';
  end if;

  select * into v_guest
  from public.guests
  where id = p_expected_guest_id
  for update;

  if not found then
    raise exception 'Cadastro de hóspede vinculado não encontrado.';
  end if;

  v_has_comparable_contact :=
    (nullif(trim(coalesce(v_guest.email,'')), '') is not null and nullif(trim(coalesce(v_res.guest_email,'')), '') is not null)
    or
    (nullif(regexp_replace(coalesce(v_guest.phone,''), '[^0-9]', '', 'g'), '') is not null and nullif(regexp_replace(coalesce(v_res.guest_phone,''), '[^0-9]', '', 'g'), '') is not null);

  v_link_safe :=
    lower(trim(coalesce(v_guest.full_name,''))) = lower(trim(coalesce(v_res.guest_name,'')))
    and (
      not v_has_comparable_contact
      or (
        nullif(trim(coalesce(v_guest.email,'')), '') is not null
        and nullif(trim(coalesce(v_res.guest_email,'')), '') is not null
        and lower(trim(v_guest.email)) = lower(trim(v_res.guest_email))
      )
      or (
        nullif(regexp_replace(coalesce(v_guest.phone,''), '[^0-9]', '', 'g'), '') is not null
        and nullif(regexp_replace(coalesce(v_res.guest_phone,''), '[^0-9]', '', 'g'), '') is not null
        and regexp_replace(v_guest.phone, '[^0-9]', '', 'g') = regexp_replace(v_res.guest_phone, '[^0-9]', '', 'g')
      )
    );

  if v_link_safe then
    raise exception 'Este vínculo é consistente com os dados da reserva e não pode ser removido por esta revisão.';
  end if;

  update public.reservations
  set guest_id = null
  where id = v_res.id;

  select count(*)::integer
  into v_total_stays
  from public.reservations r
  where r.guest_id = v_guest.id
    and r.status in ('CheckIn','CheckOut')
    and lower(trim(coalesce(v_guest.full_name,''))) = lower(trim(coalesce(r.guest_name,'')))
    and (
      not (
        (nullif(trim(coalesce(v_guest.email,'')), '') is not null and nullif(trim(coalesce(r.guest_email,'')), '') is not null)
        or
        (nullif(regexp_replace(coalesce(v_guest.phone,''), '[^0-9]', '', 'g'), '') is not null and nullif(regexp_replace(coalesce(r.guest_phone,''), '[^0-9]', '', 'g'), '') is not null)
      )
      or (
        nullif(trim(coalesce(v_guest.email,'')), '') is not null
        and nullif(trim(coalesce(r.guest_email,'')), '') is not null
        and lower(trim(v_guest.email)) = lower(trim(r.guest_email))
      )
      or (
        nullif(regexp_replace(coalesce(v_guest.phone,''), '[^0-9]', '', 'g'), '') is not null
        and nullif(regexp_replace(coalesce(r.guest_phone,''), '[^0-9]', '', 'g'), '') is not null
        and regexp_replace(v_guest.phone, '[^0-9]', '', 'g') = regexp_replace(r.guest_phone, '[^0-9]', '', 'g')
      )
    );

  update public.guests
  set total_stays = v_total_stays,
      updated_at = now()
  where id = v_guest.id;

  return jsonb_build_object(
    'reservationId', v_res.id,
    'reservationCode', v_res.code,
    'previousGuestId', v_guest.id,
    'guestName', v_guest.full_name,
    'totalStays', v_total_stays
  );
end;
$function$;

revoke all on function public.unlink_inconsistent_reservation_guest(text,text) from public, anon;
grant execute on function public.unlink_inconsistent_reservation_guest(text,text) to authenticated;
