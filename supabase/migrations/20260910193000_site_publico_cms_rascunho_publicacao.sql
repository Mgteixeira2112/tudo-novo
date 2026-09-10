alter table public.public_site_settings
  add column if not exists draft_data jsonb,
  add column if not exists draft_updated_at timestamptz;

create or replace function public.get_public_site_admin_settings(p_hotel_id text default 'hotel_1')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.staff_users%rowtype;
  v_settings public.public_site_settings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_profile
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

  select * into v_settings
    from public.public_site_settings
   where hotel_id = p_hotel_id
   limit 1;

  if v_settings.hotel_id is null then
    raise exception 'PUBLIC_SITE_SETTINGS_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'published', to_jsonb(v_settings) - 'draft_data' - 'draft_updated_at',
    'draft', v_settings.draft_data,
    'has_draft', v_settings.draft_data is not null,
    'draft_updated_at', v_settings.draft_updated_at
  );
end;
$$;

create or replace function public.save_public_site_draft(
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

  select * into v_profile
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
     set draft_data = p_payload,
         draft_updated_at = now()
   where hotel_id = p_hotel_id
   returning draft_data into v_result;

  if v_result is null then
    raise exception 'PUBLIC_SITE_SETTINGS_NOT_FOUND';
  end if;

  return v_result;
end;
$$;

create or replace function public.publish_public_site_settings(p_hotel_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.staff_users%rowtype;
  v_draft jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_profile
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

  select draft_data into v_draft
    from public.public_site_settings
   where hotel_id = p_hotel_id
   limit 1;

  if v_draft is null then
    raise exception 'NO_DRAFT_TO_PUBLISH';
  end if;

  update public.public_site_settings
     set template_key = coalesce(nullif(v_draft->>'templateKey', ''), template_key),
         primary_color = coalesce(nullif(v_draft->>'primaryColor', ''), primary_color),
         secondary_color = coalesce(nullif(v_draft->>'secondaryColor', ''), secondary_color),
         accent_color = coalesce(nullif(v_draft->>'accentColor', ''), accent_color),
         background_color = coalesce(nullif(v_draft->>'backgroundColor', ''), background_color),
         text_color = coalesce(nullif(v_draft->>'textColor', ''), text_color),
         heading_font = coalesce(nullif(v_draft->>'headingFont', ''), heading_font),
         body_font = coalesce(nullif(v_draft->>'bodyFont', ''), body_font),
         border_radius = coalesce(nullif(v_draft->>'borderRadius', ''), border_radius),
         hero_title = case when v_draft ? 'heroTitle' then v_draft->>'heroTitle' else hero_title end,
         hero_subtitle = case when v_draft ? 'heroSubtitle' then v_draft->>'heroSubtitle' else hero_subtitle end,
         hero_media_url = case when v_draft ? 'heroMediaUrl' then nullif(v_draft->>'heroMediaUrl', '') else hero_media_url end,
         hero_media_type = case
           when v_draft->>'heroMediaType' in ('image', 'video', 'none') then v_draft->>'heroMediaType'
           else hero_media_type
         end,
         primary_cta_label = coalesce(nullif(v_draft->>'primaryCtaLabel', ''), primary_cta_label),
         primary_cta_target = coalesce(nullif(v_draft->>'primaryCtaTarget', ''), primary_cta_target),
         show_booking_bar = case when v_draft ? 'showBookingBar' then (v_draft->>'showBookingBar')::boolean else show_booking_bar end,
         show_accommodations = case when v_draft ? 'showAccommodations' then (v_draft->>'showAccommodations')::boolean else show_accommodations end,
         show_services = case when v_draft ? 'showServices' then (v_draft->>'showServices')::boolean else show_services end,
         show_gallery = case when v_draft ? 'showGallery' then (v_draft->>'showGallery')::boolean else show_gallery end,
         show_about = case when v_draft ? 'showAbout' then (v_draft->>'showAbout')::boolean else show_about end,
         show_location = case when v_draft ? 'showLocation' then (v_draft->>'showLocation')::boolean else show_location end,
         show_contact = case when v_draft ? 'showContact' then (v_draft->>'showContact')::boolean else show_contact end,
         section_order = case
           when jsonb_typeof(v_draft->'sectionOrder') = 'array' then v_draft->'sectionOrder'
           else section_order
         end,
         status = 'published',
         draft_data = null,
         draft_updated_at = null,
         updated_at = now()
   where hotel_id = p_hotel_id
   returning to_jsonb(public_site_settings.*) - 'draft_data' - 'draft_updated_at' into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_public_site_admin_settings(text) from public, anon;
revoke all on function public.save_public_site_draft(text, jsonb) from public, anon;
revoke all on function public.publish_public_site_settings(text) from public, anon;

grant execute on function public.get_public_site_admin_settings(text) to authenticated;
grant execute on function public.save_public_site_draft(text, jsonb) to authenticated;
grant execute on function public.publish_public_site_settings(text) to authenticated;
