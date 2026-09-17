-- Corrige a proteção das tarefas operacionais para não tratar related_type NULL
-- (tarefas manuais) como se fosse RoomCleaning/RoomMaintenance.
--
-- Em SQL, `NULL NOT IN (...)` resulta em NULL, não TRUE. Com isso, uma tarefa
-- manual caía indevidamente no bloco de DELETE das tarefas operacionais e era
-- bloqueada com "Tarefa operacional de quarto aberta não pode ser excluída.".

create or replace function public.protect_room_operational_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.related_type is null
     or old.related_type not in ('RoomCleaning', 'RoomMaintenance') then
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
