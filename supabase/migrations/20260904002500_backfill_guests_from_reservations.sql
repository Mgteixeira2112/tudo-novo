with grouped as (
  select
    coalesce(nullif(lower(trim(guest_email)), ''), lower(trim(guest_name)) || '|' || coalesce(trim(guest_phone), '')) as guest_key,
    max(guest_name) as full_name,
    max(nullif(guest_email, '')) as email,
    max(nullif(guest_phone, '')) as phone,
    count(*)::int as total_stays,
    min(created_at) as first_seen,
    max(created_at) as last_seen
  from public.reservations
  where nullif(trim(guest_name), '') is not null
  group by coalesce(nullif(lower(trim(guest_email)), ''), lower(trim(guest_name)) || '|' || coalesce(trim(guest_phone), ''))
)
insert into public.guests (
  id, full_name, email, phone, document, document_type, address, city, state,
  preferences, allergies_notes, status, total_stays, total_spent, created_at, updated_at
)
select
  'guest_hist_' || substr(md5(guest_key), 1, 24),
  full_name,
  email,
  phone,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'Ativo',
  total_stays,
  0,
  first_seen,
  last_seen
from grouped g
where not exists (
  select 1 from public.guests existing
  where (g.email is not null and lower(existing.email) = lower(g.email))
     or (g.email is null and existing.full_name = g.full_name and coalesce(existing.phone,'') = coalesce(g.phone,''))
);
