alter table public.kds_displays
  alter column token set default encode(extensions.gen_random_bytes(32), 'hex');

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

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

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
revoke execute on function public.rotate_kds_display_token(uuid) from anon;
grant execute on function public.rotate_kds_display_token(uuid) to authenticated;
