-- NovoHotel — Central de Alertas Operacionais
-- Fase 2: motor de destinatários + criação atômica da notificação.
-- Arquitetura atual: uma instalação = um hotel.

create or replace function public.create_operational_notification(
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_sector text default null,
  p_responsible_user_id uuid default null,
  p_source_type text default null,
  p_source_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification public.operational_notifications%rowtype;
  v_recipient_count integer := 0;
  v_sector text := nullif(trim(coalesce(p_sector, '')), '');
  v_type text := nullif(trim(coalesce(p_type, '')), '');
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_message text := nullif(trim(coalesce(p_message, '')), '');
  v_source_type text := nullif(trim(coalesce(p_source_type, '')), '');
  v_source_id text := nullif(trim(coalesce(p_source_id, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if not exists (
    select 1 from public.staff_users su
    where su.id = auth.uid() and su.active = true
  ) then
    raise exception 'Usuário operacional inválido ou inativo.';
  end if;

  if v_type is null or v_title is null or v_message is null or v_source_type is null or v_source_id is null then
    raise exception 'Tipo, título, mensagem, origem e identificador da origem são obrigatórios.';
  end if;

  if p_priority not in ('info', 'attention', 'critical') then
    raise exception 'Prioridade inválida.';
  end if;

  if p_responsible_user_id is null and v_sector is null then
    raise exception 'Informe usuário responsável ou setor.';
  end if;

  if p_responsible_user_id is not null and not exists (
    select 1 from public.staff_users su
    where su.id = p_responsible_user_id and su.active = true
  ) then
    raise exception 'Usuário responsável inexistente ou inativo.';
  end if;

  insert into public.operational_notifications (
    type, priority, title, message, sector,
    responsible_user_id, source_type, source_id
  ) values (
    v_type, p_priority, v_title, v_message, v_sector,
    p_responsible_user_id, v_source_type, v_source_id
  )
  returning * into v_notification;

  insert into public.notification_recipients (notification_id, user_id)
  select v_notification.id, recipients.user_id
  from (
    select p_responsible_user_id as user_id
    where p_responsible_user_id is not null

    union

    select su.id as user_id
    from public.staff_users su
    where v_sector is not null
      and su.active = true
      and su.sector = v_sector
  ) recipients
  where recipients.user_id is not null
  on conflict (notification_id, user_id) do nothing;

  get diagnostics v_recipient_count = row_count;

  if v_recipient_count = 0 then
    raise exception 'Nenhum destinatário ativo encontrado para o alerta.';
  end if;

  return jsonb_build_object(
    'notification', to_jsonb(v_notification),
    'recipientCount', v_recipient_count
  );
end;
$$;

revoke all on function public.create_operational_notification(text, text, text, text, text, uuid, text, text) from public;
revoke all on function public.create_operational_notification(text, text, text, text, text, uuid, text, text) from anon;
grant execute on function public.create_operational_notification(text, text, text, text, text, uuid, text, text) to authenticated;

comment on function public.create_operational_notification(text, text, text, text, text, uuid, text, text) is
  'Cria alerta operacional e resolve destinatários por responsável OU setor, sem duplicidade. Falha se nenhum destinatário ativo for encontrado.';
