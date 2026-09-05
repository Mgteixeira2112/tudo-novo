-- NovoHotel — Central de Alertas Operacionais
-- Evolução: audiência geral operacional, preservando alertas direcionados existentes.
-- Arquitetura atual: uma instalação = um hotel.

alter table public.operational_notifications
  add column if not exists audience text not null default 'targeted';

alter table public.operational_notifications
  drop constraint if exists operational_notifications_audience_check;

alter table public.operational_notifications
  add constraint operational_notifications_audience_check
  check (audience in ('targeted', 'general'));

alter table public.operational_notifications
  drop constraint if exists operational_notifications_has_recipient_scope;

alter table public.operational_notifications
  drop constraint if exists operational_notifications_scope_consistent;

alter table public.operational_notifications
  add constraint operational_notifications_scope_consistent
  check (
    (audience = 'general' and responsible_user_id is null and sector is null)
    or
    (audience = 'targeted' and (responsible_user_id is not null or sector is not null))
  );

drop function if exists public.create_operational_notification(text, text, text, text, text, uuid, text, text);

create function public.create_operational_notification(
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_sector text default null,
  p_responsible_user_id uuid default null,
  p_source_type text default null,
  p_source_id text default null,
  p_general boolean default false
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

  if p_general then
    if p_responsible_user_id is not null or v_sector is not null then
      raise exception 'Alerta geral não deve informar usuário responsável ou setor.';
    end if;
  elsif p_responsible_user_id is null and v_sector is null then
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
    responsible_user_id, source_type, source_id, audience
  ) values (
    v_type, p_priority, v_title, v_message,
    case when p_general then null else v_sector end,
    case when p_general then null else p_responsible_user_id end,
    v_source_type, v_source_id,
    case when p_general then 'general' else 'targeted' end
  )
  returning * into v_notification;

  if p_general then
    insert into public.notification_recipients (notification_id, user_id)
    select v_notification.id, su.id
    from public.staff_users su
    where su.active = true
    on conflict (notification_id, user_id) do nothing;
  else
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
  end if;

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

revoke all on function public.create_operational_notification(text, text, text, text, text, uuid, text, text, boolean) from public;
revoke all on function public.create_operational_notification(text, text, text, text, text, uuid, text, text, boolean) from anon;
grant execute on function public.create_operational_notification(text, text, text, text, text, uuid, text, text, boolean) to authenticated;

comment on function public.create_operational_notification(text, text, text, text, text, uuid, text, text, boolean) is
  'Cria alerta operacional direcionado por responsável/setor ou alerta geral para todos os colaboradores ativos, sempre com entregas individualizadas.';
