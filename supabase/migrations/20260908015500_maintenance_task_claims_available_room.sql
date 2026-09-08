-- Fluxo inverso Manutenção -> Quarto.
-- Uma nova tarefa manual de Manutenção vinculada a um quarto Disponivel
-- passa a controlar o ciclo operacional de Manutenção desse quarto.

create or replace function public.claim_available_room_for_maintenance_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
begin
  -- Preserva tarefas geradas por outros fluxos e tarefas sem quarto.
  if new.sector <> 'Manutencao'
     or new.room_number is null
     or new.related_type is not null
     or new.related_id is not null
     or new.status = 'Concluido' then
    return new;
  end if;

  select r.*
    into v_room
  from public.rooms r
  where r.number = new.room_number
  for update;

  if not found then
    return new;
  end if;

  -- Nesta etapa, somente quarto realmente disponível é assumido pela Manutenção.
  -- Quarto Ocupado/Limpeza/Manutencao/Bloqueado mantém a tarefa como tarefa comum.
  if v_room.status = 'Disponivel'
     and v_room.current_reservation_id is null then
    new.related_type := 'RoomMaintenance';
    new.related_id := v_room.id;
  end if;

  return new;
end;
$$;

create or replace function public.move_claimed_maintenance_room_to_maintenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.related_type <> 'RoomMaintenance'
     or new.sector <> 'Manutencao'
     or new.status = 'Concluido' then
    return new;
  end if;

  update public.rooms r
  set status = 'Manutencao'
  where r.id = new.related_id
    and r.status = 'Disponivel'
    and r.current_reservation_id is null;

  return new;
end;
$$;

drop trigger if exists trg_kanban_maintenance_claim_available_room on public.kanban_tasks;
create trigger trg_kanban_maintenance_claim_available_room
before insert on public.kanban_tasks
for each row execute function public.claim_available_room_for_maintenance_task();

drop trigger if exists trg_kanban_maintenance_move_room_to_maintenance on public.kanban_tasks;
create trigger trg_kanban_maintenance_move_room_to_maintenance
after insert on public.kanban_tasks
for each row execute function public.move_claimed_maintenance_room_to_maintenance();