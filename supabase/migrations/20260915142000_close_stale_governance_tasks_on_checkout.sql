-- Encerra automaticamente a tarefa genérica de Governança criada no check-in
-- quando a própria reserva passa para CheckOut.
-- Não toca em tarefas RoomCleaning / Higienização Pós Check-out.

create or replace function public.close_stale_governance_tasks_on_checkout()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'CheckOut' and old.status is distinct from new.status then
    update public.kanban_tasks
    set status = 'Concluido',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where sector = 'Governanca'
      and related_type = 'Reserva'
      and related_id = new.id
      and status in ('A_Fazer', 'Em_Andamento')
      and title like 'Hóspede Instalado - Quarto %';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_close_stale_governance_tasks_on_checkout on public.reservations;

create trigger trg_close_stale_governance_tasks_on_checkout
after update of status on public.reservations
for each row
when (new.status = 'CheckOut')
execute function public.close_stale_governance_tasks_on_checkout();

-- Backfill seguro: apenas tarefas genéricas antigas ligadas a reservas que já estão em CheckOut.
update public.kanban_tasks kt
set status = 'Concluido',
    completed_at = coalesce(kt.completed_at, now()),
    updated_at = now()
from public.reservations r
where kt.sector = 'Governanca'
  and kt.related_type = 'Reserva'
  and kt.related_id = r.id
  and kt.status in ('A_Fazer', 'Em_Andamento')
  and kt.title like 'Hóspede Instalado - Quarto %'
  and r.status = 'CheckOut';
