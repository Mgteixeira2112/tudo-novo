-- Encerramento da reserva ficticia solicitada para homologacao da PR #335.
-- Preserva a reserva e o perfil de teste como historico; nao toca outros hospedes.
-- Reexecutavel: no replay de migrations, o pre-check-in pode ainda estar NaoIniciado.
-- Nao usa o ID/codigo/quarto gerados, que variam entre ambientes.
DO $cleanup$
DECLARE
  v_res public.reservations%rowtype;
  v_matches integer;
  v_updated integer;
  v_marker constant text := 'HOMOLOGACAO_PRECHECKIN_PR335_CONCLUIDA - reserva ficticia cancelada';
BEGIN
  SELECT count(*) INTO v_matches
  FROM public.reservations
  WHERE notes LIKE 'TESTE_PRECHECKIN_PR335%';
  IF v_matches <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one identifiable pre-checkin PR335 fixture; found %', v_matches;
  END IF;

  SELECT * INTO v_res FROM public.reservations
  WHERE notes LIKE 'TESTE_PRECHECKIN_PR335%'
  FOR UPDATE;

  IF v_res.status = 'Cancelada' THEN
    IF position(v_marker IN coalesce(v_res.notes, '')) = 0 THEN
      RAISE EXCEPTION 'Fixture was cancelled by another process; inspect its audit trail';
    END IF;
    RETURN;
  END IF;

  IF v_res.status IS DISTINCT FROM 'Confirmada'
     OR v_res.guest_email IS DISTINCT FROM 'precheckin-pr335@example.invalid'
     OR v_res.room_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = v_res.room_id AND r.type_id = 'rt_standard')
     OR v_res.check_out_date IS DISTINCT FROM v_res.check_in_date + 1
     OR v_res.checked_in_at IS NOT NULL
     OR v_res.checked_out_at IS NOT NULL
     OR v_res.payment_status IS DISTINCT FROM 'Pendente'
     OR v_res.pre_checkin_status NOT IN ('NaoIniciado','Concluido')
     OR (v_res.pre_checkin_status = 'Concluido' AND v_res.guest_id IS NULL)
     OR v_res.pre_checkin_token_hash IS NOT NULL
     OR v_res.pre_checkin_token_expires_at IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.current_reservation_id = v_res.id)
     OR EXISTS (SELECT 1 FROM public.financial_transactions f WHERE f.reservation_id = v_res.id)
     OR EXISTS (SELECT 1 FROM public.kitchen_orders k WHERE k.reservation_id = v_res.id)
     OR EXISTS (SELECT 1 FROM public.operational_notifications n WHERE n.source_id = v_res.id AND lower(coalesce(n.source_type, '')) = 'reservation')
  THEN
    RAISE EXCEPTION 'Fixture differs from expected test-only state; cancellation aborted';
  END IF;

  UPDATE public.reservations
  SET status = 'Cancelada',
      notes = concat_ws(' | ', nullif(notes, ''),
              '[Cancelamento de teste] ' || v_marker),
      pre_checkin_token_hash = NULL,
      pre_checkin_token_issued_at = NULL,
      pre_checkin_token_expires_at = NULL
  WHERE id = v_res.id AND status = 'Confirmada'
    AND notes LIKE 'TESTE_PRECHECKIN_PR335%';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one fixture cancellation; updated %', v_updated;
  END IF;
END;
$cleanup$;
