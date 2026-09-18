-- Govermix: auditoria consolidada de integridade operacional.
-- Execute no SQL Editor do Supabase com acesso autorizado. Apenas SELECT.
-- Resultado: uma linha por verificacao; failed_checks e issues_total resumem a execucao.
-- Escopo: registros atuais. Nao substitui testes de autorizacao, RLS, UX ou transicoes em tempo real.
-- Movimentos Transferencia/Ajuste_Inventario possuem semantica distinta: sem inferencia de delta.
WITH checks AS (
  SELECT 'reservas_ativas_sem_quarto_valido' AS check_name, count(*)::bigint AS issues
    FROM public.reservations r LEFT JOIN public.rooms q ON q.id = r.room_id
   WHERE r.status = 'CheckIn' AND (q.id IS NULL OR q.current_reservation_id IS DISTINCT FROM r.id OR q.status NOT IN ('Ocupado','Bloqueado'))
  UNION ALL
  SELECT 'quartos_com_reserva_invalida', count(*)::bigint
    FROM public.rooms q LEFT JOIN public.reservations r ON r.id = q.current_reservation_id
   WHERE q.current_reservation_id IS NOT NULL AND (r.id IS NULL OR r.status <> 'CheckIn' OR r.room_id IS DISTINCT FROM q.id)
  UNION ALL
  SELECT 'reservas_ativas_sobrepostas', count(*)::bigint
    FROM public.reservations a JOIN public.reservations b ON a.id < b.id AND a.room_id = b.room_id
   WHERE a.room_id IS NOT NULL AND a.status IN ('Confirmada','CheckIn') AND b.status IN ('Confirmada','CheckIn')
     AND a.check_in_date < b.check_out_date AND b.check_in_date < a.check_out_date
  UNION ALL
  SELECT 'tarefas_operacionais_duplicadas', coalesce(sum(n-1),0)::bigint
    FROM (SELECT count(*) AS n FROM public.kanban_tasks WHERE related_type IN ('RoomCleaning','RoomMaintenance') AND status <> 'Concluido' GROUP BY related_type,related_id HAVING count(*)>1) duplicates
  UNION ALL
  SELECT 'tarefas_operacionais_sem_quarto', count(*)::bigint
    FROM public.kanban_tasks t LEFT JOIN public.rooms q ON q.id=t.related_id
   WHERE t.related_type IN ('RoomCleaning','RoomMaintenance') AND t.status <> 'Concluido' AND q.id IS NULL
  UNION ALL
  SELECT 'tarefas_quarto_estado_incoerente', count(*)::bigint
    FROM public.kanban_tasks t JOIN public.rooms q ON q.id=t.related_id
   WHERE t.related_type IN ('RoomCleaning','RoomMaintenance') AND t.status <> 'Concluido'
     AND (q.status IS DISTINCT FROM CASE WHEN t.related_type='RoomCleaning' THEN 'Limpeza' ELSE 'Manutencao' END OR q.current_reservation_id IS NOT NULL)
  UNION ALL
  SELECT 'quartos_em_preparacao_sem_tarefa', count(*)::bigint
    FROM public.rooms q WHERE q.status IN ('Limpeza','Manutencao') AND q.current_reservation_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.kanban_tasks t WHERE t.related_id=q.id AND t.related_type=CASE WHEN q.status='Limpeza' THEN 'RoomCleaning' ELSE 'RoomMaintenance' END AND t.status <> 'Concluido')
  UNION ALL
  SELECT 'tarefas_com_data_conclusao_incorreta', count(*)::bigint
    FROM public.kanban_tasks WHERE (status='Concluido' AND completed_at IS NULL) OR (status <> 'Concluido' AND completed_at IS NOT NULL)
  UNION ALL
  SELECT 'estoque_com_saldo_invalido', count(*)::bigint
    FROM public.inventory_items WHERE current_stock IS NULL OR current_stock < 0 OR min_stock < 0 OR (max_stock IS NOT NULL AND max_stock < min_stock)
  UNION ALL
  SELECT 'movimentos_de_estoque_sem_tarefa', count(*)::bigint
    FROM public.stock_movements m LEFT JOIN public.kanban_tasks t ON t.id=m.related_task_id WHERE m.related_task_id IS NOT NULL AND t.id IS NULL
  UNION ALL
  SELECT 'movimentos_com_saldo_incoerente', count(*)::bigint
    FROM public.stock_movements m WHERE
       (m.type IN ('Saida_Consumo_Interno','Saida_Consumo_Quarto','Saida_Venda_A_B','Perda_Avaria') AND abs((m.previous_stock-m.new_stock)-m.quantity)>0.00001)
       OR (m.type='Entrada_Compra' AND abs((m.new_stock-m.previous_stock)-m.quantity)>0.00001)
       OR m.quantity <= 0 OR m.previous_stock IS NULL OR m.new_stock IS NULL
  UNION ALL
  SELECT 'pedidos_com_reserva_inexistente', count(*)::bigint
    FROM public.kitchen_orders o LEFT JOIN public.reservations r ON r.id=o.reservation_id WHERE o.reservation_id IS NOT NULL AND r.id IS NULL
  UNION ALL
  SELECT 'receitas_com_reserva_inexistente', count(*)::bigint
    FROM public.financial_transactions f LEFT JOIN public.reservations r ON r.id=f.reservation_id WHERE f.reservation_id IS NOT NULL AND r.id IS NULL
  UNION ALL
  SELECT 'entregas_de_alerta_sem_vinculo', count(*)::bigint
    FROM public.notification_recipients n LEFT JOIN public.operational_notifications a ON a.id=n.notification_id LEFT JOIN public.staff_users u ON u.id=n.user_id WHERE a.id IS NULL OR u.id IS NULL
  UNION ALL
  SELECT 'destinatarios_de_alerta_duplicados', coalesce(sum(n-1),0)::bigint
    FROM (SELECT count(*) AS n FROM public.notification_recipients GROUP BY notification_id,user_id HAVING count(*)>1) duplicates
  UNION ALL
  SELECT 'alertas_sem_destinatario', count(*)::bigint
    FROM public.operational_notifications a WHERE NOT EXISTS (SELECT 1 FROM public.notification_recipients n WHERE n.notification_id=a.id)
  UNION ALL
  SELECT 'alertas_de_reserva_sem_origem', count(*)::bigint
    FROM public.operational_notifications a LEFT JOIN public.reservations r ON r.id=a.source_id WHERE lower(coalesce(a.source_type,''))='reservation' AND r.id IS NULL
)
SELECT check_name, issues, CASE WHEN issues=0 THEN 'OK' ELSE 'FALHA' END AS result,
       count(*) OVER() AS checks_total,
       count(*) FILTER (WHERE issues>0) OVER() AS failed_checks,
       sum(issues) OVER() AS issues_total
FROM checks
ORDER BY check_name;
