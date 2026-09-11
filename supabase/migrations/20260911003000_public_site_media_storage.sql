insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-site-media',
  'public-site-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_site_media_insert" on storage.objects;
drop policy if exists "public_site_media_update" on storage.objects;
drop policy if exists "public_site_media_delete" on storage.objects;

create policy "public_site_media_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-site-media'
  and exists (
    select 1
    from public.staff_users su
    where su.id = auth.uid()
      and coalesce(su.active, false) = true
      and (
        coalesce(su.role, '') = 'admin'
        or coalesce(su.permissions, '[]'::jsonb) ? 'manage_hotel_settings'
      )
  )
);

create policy "public_site_media_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-site-media'
  and exists (
    select 1
    from public.staff_users su
    where su.id = auth.uid()
      and coalesce(su.active, false) = true
      and (
        coalesce(su.role, '') = 'admin'
        or coalesce(su.permissions, '[]'::jsonb) ? 'manage_hotel_settings'
      )
  )
)
with check (
  bucket_id = 'public-site-media'
  and exists (
    select 1
    from public.staff_users su
    where su.id = auth.uid()
      and coalesce(su.active, false) = true
      and (
        coalesce(su.role, '') = 'admin'
        or coalesce(su.permissions, '[]'::jsonb) ? 'manage_hotel_settings'
      )
  )
);

create policy "public_site_media_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-site-media'
  and exists (
    select 1
    from public.staff_users su
    where su.id = auth.uid()
      and coalesce(su.active, false) = true
      and (
        coalesce(su.role, '') = 'admin'
        or coalesce(su.permissions, '[]'::jsonb) ? 'manage_hotel_settings'
      )
  )
);
