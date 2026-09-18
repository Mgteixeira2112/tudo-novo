-- A regular checkout changes Ocupado -> Limpeza and inserts the dedicated
-- "Higienização Pós Check-out" task, which is normalized to RoomCleaning.
-- Overdue stays change Bloqueado -> Limpeza instead; the room trigger was
-- inserting a generic RoomCleaning task first, and the dedicated insert then
-- violated uq_kanban_open_room_operational_task, rolling back checkout.
-- Treat both occupied states identically only when releasing a reservation.

DO $guard$
DECLARE
  v_definition text := pg_get_functiondef('public.ensure_room_operational_task()'::regprocedure);
BEGIN
  IF v_definition IS NULL
     OR position('and old.status = ''Ocupado''' in v_definition) = 0
     OR position('and new.status = ''Limpeza''' in v_definition) = 0
     OR position('and old.current_reservation_id is not null' in v_definition) = 0
     OR position('and new.current_reservation_id is null' in v_definition) = 0 THEN
    RAISE EXCEPTION 'ensure_room_operational_task changed: review checkout task synchronization before applying migration.';
  END IF;
END;
$guard$;

CREATE OR REPLACE FUNCTION public.ensure_room_operational_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_related_type text;
  v_sector text;
  v_title text;
  v_description text;
  v_priority text;
BEGIN
  IF tg_op = 'UPDATE' AND new.status IS NOT DISTINCT FROM old.status THEN
    RETURN new;
  END IF;

  IF new.status NOT IN ('Limpeza', 'Manutencao') THEN
    RETURN new;
  END IF;

  -- Checkout inserts its own cleaning task for both occupied and overdue
  -- blocked rooms; do not pre-create another task for the same room.
  IF tg_op = 'UPDATE'
     AND old.status IN ('Ocupado', 'Bloqueado')
     AND new.status = 'Limpeza'
     AND old.current_reservation_id IS NOT NULL
     AND new.current_reservation_id IS NULL THEN
    RETURN new;
  END IF;

  IF new.status = 'Limpeza' THEN
    v_related_type := 'RoomCleaning';
    v_sector := 'Governanca';
    v_title := format('Limpeza do Quarto %s', new.number);
    v_description := format('Executar limpeza e liberar o Quarto %s para disponibilidade.', new.number);
    v_priority := 'Alta';
  ELSE
    v_related_type := 'RoomMaintenance';
    v_sector := 'Manutencao';
    v_title := format('Manutenção do Quarto %s', new.number);
    v_description := format('Executar manutenção e liberar o Quarto %s para disponibilidade.', new.number);
    v_priority := 'Alta';
  END IF;

  INSERT INTO public.kanban_tasks (
    id, title, description, sector, status, priority,
    room_number, related_type, related_id, created_at, updated_at
  ) VALUES (
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
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$function$;
