alter table public.kanban_tasks
  add column if not exists completed_at timestamptz;

update public.kanban_tasks
set completed_at = coalesce(completed_at, updated_at, now())
where status = 'Concluido'
  and completed_at is null;

create or replace function public.sync_kanban_task_completed_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'Concluido' then
    if tg_op = 'INSERT' or old.status is distinct from 'Concluido' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_kanban_task_completed_at on public.kanban_tasks;

create trigger trg_sync_kanban_task_completed_at
before insert or update of status on public.kanban_tasks
for each row
execute function public.sync_kanban_task_completed_at();

create index if not exists idx_kanban_tasks_completed_at
  on public.kanban_tasks (completed_at desc)
  where status = 'Concluido';
