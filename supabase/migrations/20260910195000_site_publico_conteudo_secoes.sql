alter table public.public_site_settings
  add column if not exists section_content jsonb not null default '{}'::jsonb;

create or replace function public.get_public_site_settings(p_hotel_id text default 'hotel_1')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'hotel_id', pss.hotel_id,
    'status', pss.status,
    'template_key', pss.template_key,
    'primary_color', pss.primary_color,
    'secondary_color', pss.secondary_color,
    'accent_color', pss.accent_color,
    'background_color', pss.background_color,
    'text_color', pss.text_color,
    'heading_font', pss.heading_font,
    'body_font', pss.body_font,
    'border_radius', pss.border_radius,
    'hero_title', coalesce(pss.hero_title, hs.hotel_name),
    'hero_subtitle', coalesce(pss.hero_subtitle, hs.tagline, ''),
    'hero_media_url', pss.hero_media_url,
    'hero_media_type', pss.hero_media_type,
    'primary_cta_label', pss.primary_cta_label,
    'primary_cta_target', pss.primary_cta_target,
    'show_booking_bar', pss.show_booking_bar,
    'show_accommodations', pss.show_accommodations,
    'show_services', pss.show_services,
    'show_gallery', pss.show_gallery,
    'show_about', pss.show_about,
    'show_location', pss.show_location,
    'show_contact', pss.show_contact,
    'section_order', pss.section_order,
    'section_content', pss.section_content,
    'custom_domain', pss.custom_domain,
    'subdomain_slug', pss.subdomain_slug,
    'updated_at', pss.updated_at
  )
  from public.public_site_settings pss
  join public.hotel_settings hs on hs.id = pss.hotel_id
  where pss.hotel_id = p_hotel_id
    and pss.status = 'published'
  limit 1;
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
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_profile from public.staff_users where id = auth.uid() limit 1;
  if v_profile.id is null or coalesce(v_profile.active, false) = false then raise exception 'USER_NOT_ACTIVE'; end if;
  if coalesce(v_profile.role, '') <> 'admin'
     and not (coalesce(v_profile.permissions, '[]'::jsonb) ? 'manage_hotel_settings') then
    raise exception 'PERMISSION_DENIED';
  end if;

  select draft_data into v_draft
    from public.public_site_settings
   where hotel_id = p_hotel_id
   limit 1;
  if v_draft is null then raise exception 'NO_DRAFT_TO_PUBLISH'; end if;

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
         hero_media_type = case when v_draft->>'heroMediaType' in ('image','video','none') then v_draft->>'heroMediaType' else hero_media_type end,
         primary_cta_label = coalesce(nullif(v_draft->>'primaryCtaLabel', ''), primary_cta_label),
         primary_cta_target = coalesce(nullif(v_draft->>'primaryCtaTarget', ''), primary_cta_target),
         show_booking_bar = case when v_draft ? 'showBookingBar' then (v_draft->>'showBookingBar')::boolean else show_booking_bar end,
         show_accommodations = case when v_draft ? 'showAccommodations' then (v_draft->>'showAccommodations')::boolean else show_accommodations end,
         show_services = case when v_draft ? 'showServices' then (v_draft->>'showServices')::boolean else show_services end,
         show_gallery = case when v_draft ? 'showGallery' then (v_draft->>'showGallery')::boolean else show_gallery end,
         show_about = case when v_draft ? 'showAbout' then (v_draft->>'showAbout')::boolean else show_about end,
         show_location = case when v_draft ? 'showLocation' then (v_draft->>'showLocation')::boolean else show_location end,
         show_contact = case when v_draft ? 'showContact' then (v_draft->>'showContact')::boolean else show_contact end,
         section_order = case when jsonb_typeof(v_draft->'sectionOrder') = 'array' then v_draft->'sectionOrder' else section_order end,
         section_content = case when jsonb_typeof(v_draft->'sectionContent') = 'object' then v_draft->'sectionContent' else section_content end,
         status = 'published',
         draft_data = null,
         draft_updated_at = null,
         updated_at = now()
   where hotel_id = p_hotel_id
   returning to_jsonb(public_site_settings.*) - 'draft_data' - 'draft_updated_at' into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_public_site_settings(text) from public;
grant execute on function public.get_public_site_settings(text) to anon, authenticated;
revoke all on function public.publish_public_site_settings(text) from public, anon;
grant execute on function public.publish_public_site_settings(text) to authenticated;
