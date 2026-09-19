-- Fixture de homologacao solicitada pelo proprietario: 1 reserva CONFIRMADA, sem hospede preexistente.
-- Dados inteiramente ficticios; nao gera link/token nem altera cadastros de hospedes.
-- A marcacao permite localizar e cancelar a reserva apos o teste.
DO $fixture$
DECLARE
  v_check_in date := (timezone('America/Sao_Paulo', now()))::date + 4;
  v_check_out date := (timezone('America/Sao_Paulo', now()))::date + 5;
  v_room public.rooms%rowtype;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reservations
    WHERE notes LIKE 'TESTE_PRECHECKIN_PR335%'
  ) THEN
    RETURN; -- uma unica fixture mesmo se reaplicada
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('reservation:rt_standard', 0));
  SELECT r.* INTO v_room
  FROM public.rooms r
  WHERE r.type_id = 'rt_standard'
    AND r.status = 'Disponivel'
    AND NOT EXISTS (
      SELECT 1 FROM public.reservations existing
      WHERE existing.room_id = r.id
        AND existing.status IN ('Pendente','Confirmada','CheckIn')
        AND daterange(existing.check_in_date, existing.check_out_date, '[)')
            && daterange(v_check_in, v_check_out, '[)')
    )
  ORDER BY r.number
  FOR UPDATE OF r SKIP LOCKED
  LIMIT 1;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Sem quarto Standard disponivel para fixture de pre-check-in; nenhum dado criado';
  END IF;

  INSERT INTO public.reservations (
    id, code, guest_id, guest_name, guest_email, guest_phone,
    room_id, room_number, room_type_name, check_in_date, check_out_date,
    nights, adults, children, price_per_night, total_nights_amount,
    status, payment_status, payment_method, notes
  ) VALUES (
    'res_' || replace(gen_random_uuid()::text, '-', ''),
    'NH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    NULL, 'Teste Pre-Check-in PR335', 'precheckin-pr335@example.invalid', '00000000000',
    v_room.id, v_room.number, v_room.type_name, v_check_in, v_check_out,
    1, 1, 0, v_room.price_per_night, v_room.price_per_night,
    'Confirmada', 'Pendente', 'PIX',
    'TESTE_PRECHECKIN_PR335 - RESERVA FICTICIA; CANCELAR APOS HOMOLOGACAO'
  );
END;
$fixture$;
