create or replace function public.get_hotel_settings_admin()
returns public.hotel_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean;
  v_row public.hotel_settings;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select exists (
    select 1
    from public.staff_users s
    where s.id = v_user_id
      and s.active = true
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Usuário sem perfil ativo.';
  end if;

  select * into v_row
  from public.hotel_settings
  order by updated_at desc
  limit 1;

  if v_row.id is null then
    raise exception 'Configurações do hotel não encontradas.';
  end if;

  return v_row;
end;
$$;

create or replace function public.update_hotel_settings_safe(p_updates jsonb)
returns public.hotel_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean;
  v_row public.hotel_settings;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select exists (
    select 1
    from public.staff_users s
    where s.id = v_user_id
      and s.active = true
      and (
        s.role = 'admin'
        or coalesce(s.permissions, '[]'::jsonb) ? 'manage_settings'
      )
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Sem permissão para alterar configurações do hotel.';
  end if;

  select * into v_row
  from public.hotel_settings
  order by updated_at desc
  limit 1
  for update;

  if v_row.id is null then
    raise exception 'Configurações do hotel não encontradas.';
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
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.get_hotel_settings_admin() from public, anon;
revoke all on function public.update_hotel_settings_safe(jsonb) from public, anon;
grant execute on function public.get_hotel_settings_admin() to authenticated;
grant execute on function public.update_hotel_settings_safe(jsonb) to authenticated;
