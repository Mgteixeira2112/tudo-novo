create or replace function public.save_public_site_settings(
  p_hotel_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.staff_users%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
    into v_profile
    from public.staff_users
   where id = auth.uid()
   limit 1;

  if v_profile.id is null or coalesce(v_profile.active, false) = false then
    raise exception 'USER_NOT_ACTIVE';
  end if;

  if coalesce(v_profile.role, '') <> 'admin'
     and not (coalesce(v_profile.permissions, '[]'::jsonb) ? 'manage_hotel_settings') then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.public_site_settings
     set template_key = coalesce(nullif(p_payload->>'templateKey', ''), template_key),
         primary_color = coalesce(nullif(p_payload->>'primaryColor', ''), primary_color),
         secondary_color = coalesce(nullif(p_payload->>'secondaryColor', ''), secondary_color),
         accent_color = coalesce(nullif(p_payload->>'accentColor', ''), accent_color),
         background_color = coalesce(nullif(p_payload->>'backgroundColor', ''), background_color),
         text_color = coalesce(nullif(p_payload->>'textColor', ''), text_color),
         heading_font = coalesce(nullif(p_payload->>'headingFont', ''), heading_font),
         body_font = coalesce(nullif(p_payload->>'bodyFont', ''), body_font),
         border_radius = coalesce(nullif(p_payload->>'borderRadius', ''), border_radius),
         hero_title = case when p_payload ? 'heroTitle' then p_payload->>'heroTitle' else hero_title end,
         hero_subtitle = case when p_payload ? 'heroSubtitle' then p_payload->>'heroSubtitle' else hero_subtitle end,
         hero_media_url = case when p_payload ? 'heroMediaUrl' then nullif(p_payload->>'heroMediaUrl', '') else hero_media_url end,
         hero_media_type = case
           when p_payload->>'heroMediaType' in ('image', 'video', 'none') then p_payload->>'heroMediaType'
           else hero_media_type
         end,
         primary_cta_label = coalesce(nullif(p_payload->>'primaryCtaLabel', ''), primary_cta_label),
         primary_cta_target = coalesce(nullif(p_payload->>'primaryCtaTarget', ''), primary_cta_target),
         show_booking_bar = case when p_payload ? 'showBookingBar' then (p_payload->>'showBookingBar')::boolean else show_booking_bar end,
         show_accommodations = case when p_payload ? 'showAccommodations' then (p_payload->>'showAccommodations')::boolean else show_accommodations end,
         show_services = case when p_payload ? 'showServices' then (p_payload->>'showServices')::boolean else show_services end,
         show_gallery = case when p_payload ? 'showGallery' then (p_payload->>'showGallery')::boolean else show_gallery end,
         show_about = case when p_payload ? 'showAbout' then (p_payload->>'showAbout')::boolean else show_about end,
         show_location = case when p_payload ? 'showLocation' then (p_payload->>'showLocation')::boolean else show_location end,
         show_contact = case when p_payload ? 'showContact' then (p_payload->>'showContact')::boolean else show_contact end,
         updated_at = now()
   where hotel_id = p_hotel_id
   returning to_jsonb(public_site_settings.*) into v_result;

  if v_result is null then
    raise exception 'PUBLIC_SITE_SETTINGS_NOT_FOUND';
  end if;

  return v_result;
end;
$$;

revoke all on function public.save_public_site_settings(text, jsonb) from public;
grant execute on function public.save_public_site_settings(text, jsonb) to authenticated;
