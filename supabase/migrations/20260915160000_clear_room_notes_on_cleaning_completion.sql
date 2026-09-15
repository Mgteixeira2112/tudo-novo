-- Limpa a observação transitória de pós-checkout quando a Governança conclui
-- a tarefa operacional de limpeza e libera o quarto.

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
  set status = 'Disponivel',
      notes = case
        when new.related_type = 'RoomCleaning'
             and r.notes like 'Aguardando higienização pós checkout de %'
          then null
        else r.notes
      end
  where r.id = new.related_id
    and r.status = v_expected_status
    and r.current_reservation_id is null;

  return new;
end;
$$;

-- Backfill seguro: limpa apenas o texto transitório de pós-checkout que ficou
-- em quartos já disponíveis, sem tocar em outras observações operacionais.
update public.rooms
set notes = null
where status = 'Disponivel'
  and current_reservation_id is null
  and notes like 'Aguardando higienização pós checkout de %';
