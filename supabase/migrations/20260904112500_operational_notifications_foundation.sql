-- NovoHotel — Central de Alertas Operacionais
-- Fase 1: fundação de dados + RLS.
-- Arquitetura atual: uma instalação = um hotel. Não introduzir hotel_id nesta fase.

create table if not exists public.operational_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  priority text not null default 'info' check (priority in ('info', 'attention', 'critical')),
  title text not null check (length(trim(title)) > 0),
  message text not null check (length(trim(message)) > 0),
  sector text null,
  responsible_user_id uuid null references public.staff_users(id) on delete set null,
  source_type text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  constraint operational_notifications_has_recipient_scope
    check (responsible_user_id is not null or sector is not null)
);

create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.operational_notifications(id) on delete cascade,
  user_id uuid not null references public.staff_users(id) on delete cascade,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint notification_recipients_unique_delivery unique (notification_id, user_id)
);

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.staff_users(id) on delete cascade,
  alerts_muted boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_operational_notifications_created_at
  on public.operational_notifications(created_at desc);

create index if not exists idx_operational_notifications_source
  on public.operational_notifications(source_type, source_id);

create index if not exists idx_operational_notifications_sector
  on public.operational_notifications(sector)
  where sector is not null;

create index if not exists idx_notification_recipients_user_unread
  on public.notification_recipients(user_id, read_at, created_at desc);

alter table public.operational_notifications enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.user_notification_preferences enable row level security;

-- A notificação-mãe só é visível para usuários que possuem uma entrega individual.
drop policy if exists operational_notifications_select_recipient on public.operational_notifications;
create policy operational_notifications_select_recipient
  on public.operational_notifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.notification_recipients nr
      where nr.notification_id = operational_notifications.id
        and nr.user_id = auth.uid()
    )
  );

-- Cada usuário enxerga somente suas próprias entregas.
drop policy if exists notification_recipients_select_own on public.notification_recipients;
create policy notification_recipients_select_own
  on public.notification_recipients
  for select
  to authenticated
  using (user_id = auth.uid());

-- Leitura é individual. Nenhuma política de INSERT/DELETE é criada para clientes.
drop policy if exists notification_recipients_update_own on public.notification_recipients;
create policy notification_recipients_update_own
  on public.notification_recipients
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Preferência de mute é estritamente individual.
drop policy if exists user_notification_preferences_select_own on public.user_notification_preferences;
create policy user_notification_preferences_select_own
  on public.user_notification_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_notification_preferences_insert_own on public.user_notification_preferences;
create policy user_notification_preferences_insert_own
  on public.user_notification_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_notification_preferences_update_own on public.user_notification_preferences;
create policy user_notification_preferences_update_own
  on public.user_notification_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.operational_notifications from anon;
revoke all on table public.notification_recipients from anon;
revoke all on table public.user_notification_preferences from anon;

revoke insert, update, delete on table public.operational_notifications from authenticated;
revoke insert, delete on table public.notification_recipients from authenticated;

grant select on table public.operational_notifications to authenticated;
grant select on table public.notification_recipients to authenticated;
grant update (read_at) on table public.notification_recipients to authenticated;
grant select, insert on table public.user_notification_preferences to authenticated;
grant update (alerts_muted, updated_at) on table public.user_notification_preferences to authenticated;

comment on table public.operational_notifications is
  'Eventos operacionais de alerta. Não duplica o estado do objeto de origem; mantém source_type/source_id.';
comment on table public.notification_recipients is
  'Entregas individualizadas por usuário, com leitura individual.';
comment on table public.user_notification_preferences is
  'Preferência individual de interrupções de alerta; silenciar não impede recebimento.';