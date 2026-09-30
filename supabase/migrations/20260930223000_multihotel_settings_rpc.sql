-- NovoHotel / Reservas Lite — tenant-safe settings RPCs

create or replace function public.get_hotel_settings_admin_for_hotel(p_hotel_id text)
returns public.hotel_settings
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.hotel_settings;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if not public.user_has_hotel_access(p_hotel_id) then
    raise exception 'Usuário sem acesso ao hotel.' using errcode = '42501';
  end if;

  select * into v_row
  from public.hotel_settings
  where id = p_hotel_id;

  if v_row.id is null then
    raise exception 'Configurações do hotel não encontradas.' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

create or replace function public.update_hotel_settings_safe_for_hotel(
  p_hotel_id text,
  p_updates jsonb
)
returns public.hotel_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean;
  v_row public.hotel_settings;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if not public.user_has_hotel_access(p_hotel_id) then
    raise exception 'Usuário sem acesso ao hotel.' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.staff_users s
    join public.hotel_memberships hm
      on hm.user_id = s.id
     and hm.hotel_id = p_hotel_id
     and hm.active
    where s.id = v_user_id
      and s.active = true
      and (
        s.role in ('admin','gerente')
        or coalesce(s.permissions, '[]'::jsonb) ? 'manage_settings'
        or coalesce(s.permissions, '[]'::jsonb) ? 'manage_hotel_settings'
      )
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Sem permissão para alterar configurações do hotel.' using errcode = '42501';
  end if;

  select * into v_row
  from public.hotel_settings
  where id = p_hotel_id
  for update;

  if v_row.id is null then
    raise exception 'Configurações do hotel não encontradas.' using errcode = 'P0002';
  end if;

  update public.hotel_settings
  set
    hotel_name = coalesce(p_updates->>'hotel_name', hotel_name),
    tagline = case when p_updates ? 'tagline' then p_updates->>'tagline' else tagline end,
    description = case when p_updates ? 'description' then p_updates->>'description' else description end,
    logo_icon = case when p_updates ? 'logo_icon' then p_updates->>'logo_icon' else logo_icon end,
    primary_color = case when p_updates ? 'primary_color' then p_updates->>'primary_color' else primary_color end,
    currency = coalesce(p_updates->>'currency', currency),
    tax_rate_percent = case when p_updates ? 'tax_rate_percent' then (p_updates->>'tax_rate_percent')::numeric else tax_rate_percent end,
    check_in_time = case when p_updates ? 'check_in_time' then p_updates->>'check_in_time' else check_in_time end,
    check_out_time = case when p_updates ? 'check_out_time' then p_updates->>'check_out_time' else check_out_time end,
    address = case when p_updates ? 'address' then p_updates->>'address' else address end,
    city_state = case when p_updates ? 'city_state' then p_updates->>'city_state' else city_state end,
    phone = case when p_updates ? 'phone' then p_updates->>'phone' else phone end,
    email = case when p_updates ? 'email' then p_updates->>'email' else email end,
    booking_policies = case when p_updates ? 'booking_policies' then p_updates->>'booking_policies' else booking_policies end,
    wifi_password = case when p_updates ? 'wifi_password' then p_updates->>'wifi_password' else wifi_password end,
    room_types = case when p_updates ? 'room_types' then p_updates->'room_types' else room_types end,
    updated_at = now()
  where id = p_hotel_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.get_hotel_settings_admin_for_hotel(text) from public, anon;
revoke all on function public.update_hotel_settings_safe_for_hotel(text, jsonb) from public, anon;
grant execute on function public.get_hotel_settings_admin_for_hotel(text) to authenticated;
grant execute on function public.update_hotel_settings_safe_for_hotel(text, jsonb) to authenticated;
