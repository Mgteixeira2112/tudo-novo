-- Sincronização operacional entre rooms.status e kanban_tasks.
-- Um quarto em Limpeza/Manutencao passa a ser controlado por uma única tarefa operacional.

create unique index if not exists uq_kanban_open_room_operational_task
  on public.kanban_tasks (related_type, related_id)
  where related_type in ('RoomCleaning', 'RoomMaintenance')
    and status <> 'Concluido';

create or replace function public.ensure_room_operational_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_related_type text;
  v_sector text;
  v_title text;
  v_description text;
  v_priority text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if new.status not in ('Limpeza', 'Manutencao') then
    return new;
  end if;

  -- O checkout já cria a tarefa "Higienização Pós Check-out" logo após mudar o quarto
  -- de Ocupado para Limpeza. Essa tarefa será normalizada por outro trigger abaixo.
  if tg_op = 'UPDATE'
     and old.status = 'Ocupado'
     and new.status = 'Limpeza'
     and old.current_reservation_id is not null
     and new.current_reservation_id is null then
    return new;
  end if;

  if new.status = 'Limpeza' then
    v_related_type := 'RoomCleaning';
    v_sector := 'Governanca';
    v_title := format('Limpeza do Quarto %s', new.number);
    v_description := format('Executar limpeza e liberar o Quarto %s para disponibilidade.', new.number);
    v_priority := 'Alta';
  else
    v_related_type := 'RoomMaintenance';
    v_sector := 'Manutencao';
    v_title := format('Manutenção do Quarto %s', new.number);
    v_description := format('Executar manutenção e liberar o Quarto %s para disponibilidade.', new.number);
    v_priority := 'Alta';
  end if;

  insert into public.kanban_tasks (
    id, title, description, sector, status, priority,
    room_number, related_type, related_id, created_at, updated_at
  ) values (
    'task_' || md5(new.id || ':' || new.status || ':' || clock_timestamp()::text || ':' || random()::text),
    v_title,
    v_description,
    v_sector,
    'A_Fazer',
    v_priority,
    new.number,
    v_related_type,
    new.id,
    now(),
    now()
  )
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.normalize_checkout_cleaning_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id text;
begin
  if new.sector <> 'Governanca'
     or new.related_type <> 'Reserva'
     or new.room_number is null
     or new.title not like 'Higienização Pós Check-out - Quarto %' then
    return new;
  end if;

  select r.id
    into v_room_id
  from public.rooms r
  where r.number = new.room_number
    and r.status = 'Limpeza'
    and r.current_reservation_id is null
  limit 1;

  if v_room_id is not null then
    new.related_type := 'RoomCleaning';
    new.related_id := v_room_id;
  end if;

  return new;
end;
$$;

create or replace function public.guard_room_operational_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_related_type text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'Limpeza' then
    v_related_type := 'RoomCleaning';
  elsif old.status = 'Manutencao' then
    v_related_type := 'RoomMaintenance';
  else
    return new;
  end if;

  if exists (
    select 1
    from public.kanban_tasks kt
    where kt.related_type = v_related_type
      and kt.related_id = old.id
      and kt.status <> 'Concluido'
  ) then
    raise exception 'Quarto % está sob controle de uma tarefa operacional aberta. Conclua a tarefa antes de alterar o status.', old.number;
  end if;

  return new;
end;
$$;

create or replace function public.protect_room_operational_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.related_type not in ('RoomCleaning', 'RoomMaintenance') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status <> 'Concluido' then
      raise exception 'Tarefa operacional de quarto aberta não pode ser excluída.';
    end if;
    return old;
  end if;

  if old.status = 'Concluido' and new.status <> 'Concluido' then
    raise exception 'Tarefa operacional de quarto concluída não pode ser reaberta.';
  end if;

  if old.status <> 'Concluido' and (
    new.related_type is distinct from old.related_type
    or new.related_id is distinct from old.related_id
    or new.sector is distinct from old.sector
    or new.room_number is distinct from old.room_number
  ) then
    raise exception 'Vínculo da tarefa operacional com o quarto não pode ser alterado.';
  end if;

  return new;
end;
$$;

create or replace function public.release_room_on_operational_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_status text;
begin
  if new.status <> 'Concluido'
     or old.status = 'Concluido'
     or new.related_type not in ('RoomCleaning', 'RoomMaintenance') then
    return new;
  end if;

  v_expected_status := case
    when new.related_type = 'RoomCleaning' then 'Limpeza'
    else 'Manutencao'
  end;

  update public.rooms r
  set status = 'Disponivel'
  where r.id = new.related_id
    and r.status = v_expected_status
    and r.current_reservation_id is null;

  return new;
end;
$$;

drop trigger if exists trg_rooms_guard_operational_transition on public.rooms;
create trigger trg_rooms_guard_operational_transition
before update of status on public.rooms
for each row execute function public.guard_room_operational_transition();

drop trigger if exists trg_rooms_create_operational_task_insert on public.rooms;
create trigger trg_rooms_create_operational_task_insert
after insert on public.rooms
for each row execute function public.ensure_room_operational_task();

drop trigger if exists trg_rooms_create_operational_task_update on public.rooms;
create trigger trg_rooms_create_operational_task_update
after update of status on public.rooms
for each row execute function public.ensure_room_operational_task();

drop trigger if exists trg_kanban_normalize_checkout_cleaning_task on public.kanban_tasks;
create trigger trg_kanban_normalize_checkout_cleaning_task
before insert on public.kanban_tasks
for each row execute function public.normalize_checkout_cleaning_task();

drop trigger if exists trg_kanban_protect_room_operational_task_update on public.kanban_tasks;
create trigger trg_kanban_protect_room_operational_task_update
before update on public.kanban_tasks
for each row execute function public.protect_room_operational_task();

drop trigger if exists trg_kanban_protect_room_operational_task_delete on public.kanban_tasks;
create trigger trg_kanban_protect_room_operational_task_delete
before delete on public.kanban_tasks
for each row execute function public.protect_room_operational_task();

drop trigger if exists trg_kanban_release_room_on_completion on public.kanban_tasks;
create trigger trg_kanban_release_room_on_completion
after update of status on public.kanban_tasks
for each row execute function public.release_room_on_operational_task_completion();
