create or replace function public.update_room_status_safe(
  p_room_id text,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if not exists (
    select 1
    from public.staff_users su
    where su.id = auth.uid()
      and su.active = true
      and (
        su.role = 'admin'
        or coalesce(su.permissions, '[]'::jsonb) ? 'manage_rooms'
      )
  ) then
    raise exception 'Permissão insuficiente para alterar status de quartos.';
  end if;

  if p_status not in ('Disponivel', 'Ocupado', 'Limpeza', 'Manutencao', 'Bloqueado') then
    raise exception 'Status de quarto inválido.';
  end if;

  select r.status
    into v_current_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_current_status is null then
    raise exception 'Quarto não encontrado.';
  end if;

  if v_current_status = 'Ocupado' and p_status <> 'Ocupado' then
    raise exception 'Quarto ocupado deve ser liberado pelo fluxo de checkout.';
  end if;

  if p_status = 'Ocupado' and v_current_status <> 'Ocupado' then
    raise exception 'Quarto só pode ficar ocupado pelo fluxo de check-in.';
  end if;

  update public.rooms r
  set status = p_status,
      notes = case when p_notes is null then r.notes else p_notes end
  where r.id = p_room_id
  returning to_jsonb(r.*) into v_result;

  return v_result;
end;
$$;

revoke all on function public.update_room_status_safe(text, text, text) from public;
grant execute on function public.update_room_status_safe(text, text, text) to authenticated;
