create extension if not exists pgcrypto;

create table if not exists public.kds_displays (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  preset text not null default 'operations' check (preset in ('operations', 'kitchen', 'housekeeping', 'maintenance', 'frontdesk')),
  active boolean not null default true,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  last_seen_at timestamptz null,
  created_by uuid null references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kds_displays enable row level security;

create or replace function public.kds_can_manage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (
        s.role = 'admin'
        or coalesce(s.permissions, '[]'::jsonb) ? 'manage_settings'
      )
  );
$$;

revoke all on function public.kds_can_manage() from public;
grant execute on function public.kds_can_manage() to authenticated;

create or replace function public.list_kds_displays()
returns table (
  id uuid,
  name text,
  preset text,
  active boolean,
  token text,
  last_seen_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.kds_can_manage() then
    raise exception 'Acesso negado para gerenciar telas KDS';
  end if;

  return query
  select d.id, d.name, d.preset, d.active, d.token, d.last_seen_at, d.created_at, d.updated_at
  from public.kds_displays d
  order by d.created_at desc;
end;
$$;

revoke all on function public.list_kds_displays() from public;
grant execute on function public.list_kds_displays() to authenticated;

create or replace function public.create_kds_display(
  p_name text,
  p_preset text default 'operations'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kds_displays%rowtype;
begin
  if not public.kds_can_manage() then
    raise exception 'Acesso negado para gerenciar telas KDS';
  end if;

  if p_preset not in ('operations', 'kitchen', 'housekeeping', 'maintenance', 'frontdesk') then
    raise exception 'Preset KDS inválido';
  end if;

  insert into public.kds_displays (name, preset, created_by)
  values (btrim(p_name), p_preset, auth.uid())
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'preset', v_row.preset,
    'active', v_row.active,
    'token', v_row.token,
    'last_seen_at', v_row.last_seen_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.create_kds_display(text, text) from public;
grant execute on function public.create_kds_display(text, text) to authenticated;

create or replace function public.update_kds_display(
  p_id uuid,
  p_name text,
  p_preset text,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kds_displays%rowtype;
begin
  if not public.kds_can_manage() then
    raise exception 'Acesso negado para gerenciar telas KDS';
  end if;

  if p_preset not in ('operations', 'kitchen', 'housekeeping', 'maintenance', 'frontdesk') then
    raise exception 'Preset KDS inválido';
  end if;

  update public.kds_displays
  set name = btrim(p_name),
      preset = p_preset,
      active = p_active,
      updated_at = now()
  where id = p_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Tela KDS não encontrada';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'preset', v_row.preset,
    'active', v_row.active,
    'token', v_row.token,
    'last_seen_at', v_row.last_seen_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.update_kds_display(uuid, text, text, boolean) from public;
grant execute on function public.update_kds_display(uuid, text, text, boolean) to authenticated;

create or replace function public.rotate_kds_display_token(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.kds_can_manage() then
    raise exception 'Acesso negado para gerenciar telas KDS';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  update public.kds_displays
  set token = v_token,
      last_seen_at = null,
      updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Tela KDS não encontrada';
  end if;

  return v_token;
end;
$$;

revoke all on function public.rotate_kds_display_token(uuid) from public;
grant execute on function public.rotate_kds_display_token(uuid) to authenticated;

create or replace function public.get_kds_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kds_displays%rowtype;
begin
  select * into v_row
  from public.kds_displays
  where token = p_token
    and active = true;

  if v_row.id is null then
    return null;
  end if;

  update public.kds_displays
  set last_seen_at = now()
  where id = v_row.id;

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'preset', v_row.preset,
    'active', true,
    'server_time', now()
  );
end;
$$;

revoke all on function public.get_kds_public(text) from public;
grant execute on function public.get_kds_public(text) to anon, authenticated;

create or replace function public.heartbeat_kds_display(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.kds_displays
  set last_seen_at = now()
  where token = p_token
    and active = true;

  return found;
end;
$$;

revoke all on function public.heartbeat_kds_display(text) from public;
grant execute on function public.heartbeat_kds_display(text) to anon, authenticated;
