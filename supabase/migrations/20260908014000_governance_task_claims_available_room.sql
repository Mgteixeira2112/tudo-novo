-- Fluxo inverso Governança -> Quarto.
-- Uma nova tarefa manual de Governança vinculada a um quarto Disponivel
-- passa a controlar o ciclo operacional de Limpeza desse quarto.

create or replace function public.claim_available_room_for_governance_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
begin
  -- Preserva tarefas geradas por outros fluxos (checkout, reservas etc.)
  -- e tarefas sem quarto.
  if new.sector <> 'Governanca'
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

  -- Nesta etapa, somente quarto realmente disponível é assumido pela Governança.
  -- Quarto Ocupado/Limpeza/Manutencao/Bloqueado mantém a tarefa como tarefa comum.
  if v_room.status = 'Disponivel'
     and v_room.current_reservation_id is null then
    new.related_type := 'RoomCleaning';
    new.related_id := v_room.id;
  end if;

  return new;
end;
$$;

create or replace function public.move_claimed_governance_room_to_cleaning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.related_type <> 'RoomCleaning'
     or new.sector <> 'Governanca'
     or new.status = 'Concluido' then
    return new;
  end if;

  update public.rooms r
  set status = 'Limpeza'
  where r.id = new.related_id
    and r.status = 'Disponivel'
    and r.current_reservation_id is null;

  return new;
end;
$$;

drop trigger if exists trg_kanban_governance_claim_available_room on public.kanban_tasks;
create trigger trg_kanban_governance_claim_available_room
before insert on public.kanban_tasks
for each row execute function public.claim_available_room_for_governance_task();

drop trigger if exists trg_kanban_governance_move_room_to_cleaning on public.kanban_tasks;
create trigger trg_kanban_governance_move_room_to_cleaning
after insert on public.kanban_tasks
for each row execute function public.move_claimed_governance_room_to_cleaning();
