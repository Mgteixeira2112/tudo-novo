create table if not exists public.public_site_settings (
  hotel_id text primary key references public.hotel_settings(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published')),
  template_key text not null default 'classic',
  primary_color text not null default '#2C3327',
  secondary_color text not null default '#588157',
  accent_color text not null default '#D4A373',
  background_color text not null default '#FDFBF7',
  text_color text not null default '#3D4035',
  heading_font text not null default 'Playfair Display',
  body_font text not null default 'Plus Jakarta Sans',
  border_radius text not null default '16px',
  hero_title text,
  hero_subtitle text,
  hero_media_url text,
  hero_media_type text not null default 'image' check (hero_media_type in ('image', 'video', 'none')),
  primary_cta_label text not null default 'Reservar agora',
  primary_cta_target text not null default 'booking',
  show_booking_bar boolean not null default true,
  show_accommodations boolean not null default true,
  show_services boolean not null default true,
  show_gallery boolean not null default true,
  show_about boolean not null default true,
  show_location boolean not null default true,
  show_contact boolean not null default true,
  section_order jsonb not null default '["hero","booking","accommodations","services","gallery","about","location","contact"]'::jsonb,
  custom_domain text,
  subdomain_slug text,
  updated_at timestamptz not null default now()
);

alter table public.public_site_settings enable row level security;

insert into public.public_site_settings (
  hotel_id,
  status,
  hero_title,
  hero_subtitle
)
select
  hs.id,
  'published',
  hs.hotel_name,
  hs.tagline
from public.hotel_settings hs
on conflict (hotel_id) do nothing;

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

revoke all on function public.get_public_site_settings(text) from public;
grant execute on function public.get_public_site_settings(text) to anon, authenticated;
