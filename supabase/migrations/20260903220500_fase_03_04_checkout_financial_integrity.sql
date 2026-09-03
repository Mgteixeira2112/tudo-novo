-- FASE 3.4 — Integridade Financeiro + Estoque/Kardex
-- Corrige o fechamento para não duplicar receita nem deixar extras pendentes após checkout.

create or replace function public.process_checkout_atomic(
  p_reservation_id text,
  p_payment_method text,
  p_amount_paid numeric,
  p_discount numeric default 0,
  p_inspector_name text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_res public.reservations%rowtype;
  v_room public.rooms%rowtype;
  v_task public.kanban_tasks%rowtype;
  v_tx public.financial_transactions%rowtype;
  v_nights numeric:=0;
  v_minibar numeric:=0;
  v_kitchen numeric:=0;
  v_discount numeric:=0;
  v_total numeric:=0;
  v_prior_paid numeric:=0;
  v_pending_extras numeric:=0;
  v_lodging_settlement numeric:=0;
  v_due numeric:=0;
  v_balance numeric:=0;
  v_note text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_users s
    where s.id = auth.uid()
      and s.active=true
      and (s.role='admin' or coalesce(s.permissions,'[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para realizar check-out.' using errcode='42501';
  end if;

  if coalesce(p_amount_paid,0)<0 or coalesce(p_discount,0)<0 then
    raise exception 'Pagamento e desconto não podem ser negativos.';
  end if;

  select * into v_res
  from public.reservations
  where id=p_reservation_id
  for update;

  if not found then raise exception 'Reserva não encontrada.'; end if;
  if v_res.status<>'CheckIn' then
    raise exception 'A reserva não está em CheckIn (status atual: %).',v_res.status;
  end if;
  if v_res.room_id is null then raise exception 'Reserva sem quarto vinculado.'; end if;

  select * into v_room
  from public.rooms
  where id=v_res.room_id
  for update;

  if not found then raise exception 'Quarto associado não encontrado.'; end if;
  if v_room.status<>'Ocupado' or v_room.current_reservation_id is distinct from v_res.id then
    raise exception 'O quarto % não está ocupado por esta reserva.',v_room.number;
  end if;

  v_nights:=coalesce(v_res.total_nights_amount,0);

  select coalesce(sum(total_price),0)
  into v_minibar
  from public.room_consumptions
  where reservation_id=v_res.id;

  select coalesce(sum(total_amount+coalesce(delivery_fee,0)),0)
  into v_kitchen
  from public.kitchen_orders
  where reservation_id=v_res.id
    and status<>'Cancelado';

  v_discount:=coalesce(p_discount,0);
  v_total:=greatest(0,v_nights+v_minibar+v_kitchen-v_discount);

  select coalesce(sum(amount),0)
  into v_prior_paid
  from public.financial_transactions
  where reservation_id=v_res.id
    and type='Receita'
    and status='Pago';

  select coalesce(sum(amount),0)
  into v_pending_extras
  from public.financial_transactions
  where reservation_id=v_res.id
    and type='Receita'
    and status='Pendente'
    and category in ('Frigobar','Room Service');

  v_due:=greatest(0,v_total-v_prior_paid);

  if abs(coalesce(p_amount_paid,0)-v_due)>0.01 then
    raise exception 'Valor do checkout divergente. Saldo devido: R$ %.',to_char(v_due,'FM999999990D00');
  end if;

  -- O valor de extras já existe como receita pendente. No checkout ele deve apenas ser liquidado,
  -- não recriado dentro de uma segunda receita de fechamento.
  v_lodging_settlement:=v_total-v_prior_paid-v_pending_extras;

  if v_lodging_settlement < -0.01 then
    raise exception 'Estrutura financeira inconsistente: cobranças pendentes excedem o saldo do folio. Reconcilie a reserva antes do checkout.';
  end if;

  v_lodging_settlement:=greatest(0,v_lodging_settlement);

  v_note:=concat_ws(
    ' | ',
    nullif(trim(coalesce(p_notes,'')),''),
    case
      when nullif(trim(coalesce(p_inspector_name,'')),'') is null then null
      else 'Inspeção: '||trim(p_inspector_name)
    end
  );

  -- Liquida cobranças operacionais existentes sem duplicá-las.
  update public.financial_transactions
  set status='Pago',
      payment_method=p_payment_method
  where reservation_id=v_res.id
    and type='Receita'
    and status='Pendente'
    and category in ('Frigobar','Room Service');

  update public.reservations
  set status='CheckOut',
      payment_status='Pago',
      payment_method=p_payment_method,
      checked_out_at=now(),
      notes=case
        when nullif(v_note,'') is null then notes
        else concat_ws(' | ',nullif(notes,''),v_note)
      end
  where id=v_res.id
  returning * into v_res;

  update public.rooms
  set status='Limpeza',
      current_reservation_id=null,
      current_guest_name=null,
      notes='Aguardando higienização pós checkout de '||v_res.guest_name||'.'
  where id=v_room.id
  returning * into v_room;

  update public.room_consumptions
  set status='Faturado'
  where reservation_id=v_res.id;

  -- Registra somente a parcela de hospedagem ainda não representada no razão.
  if v_lodging_settlement>0 then
    insert into public.financial_transactions(
      id,type,category,description,amount,payment_method,status,
      reservation_id,room_number,guest_name,date,created_at
    ) values (
      'tx_'||replace(gen_random_uuid()::text,'-',''),
      'Receita',
      'Diarias',
      'Saldo de hospedagem no Check-out ('||v_res.code||') - '||v_res.guest_name||' - Quarto '||v_room.number,
      v_lodging_settlement,
      p_payment_method,
      'Pago',
      v_res.id,
      v_room.number,
      v_res.guest_name,
      current_date,
      now()
    ) returning * into v_tx;
  end if;

  if v_res.guest_id is not null then
    update public.guests
    set total_spent=coalesce(total_spent,0)+v_total,
        updated_at=now()
    where id=v_res.guest_id;
  end if;

  insert into public.kanban_tasks(
    id,title,description,sector,status,priority,room_number,guest_name,
    related_type,related_id,created_at,updated_at
  ) values (
    'task_'||replace(gen_random_uuid()::text,'-',''),
    'Higienização Pós Check-out - Quarto '||v_room.number,
    'Check-out de '||v_res.guest_name||' concluído. Priorizar limpeza e liberação do quarto.',
    'Governanca','A_Fazer','Urgente',v_room.number,v_res.guest_name,
    'Reserva',v_res.id,now(),now()
  ) returning * into v_task;

  v_balance:=greatest(0,v_due-coalesce(p_amount_paid,0));

  return jsonb_build_object(
    'reservation',to_jsonb(v_res),
    'room',to_jsonb(v_room),
    'folio',jsonb_build_object(
      'nightsTotal',v_nights,
      'minibarTotal',v_minibar,
      'kitchenTotal',v_kitchen,
      'discount',v_discount,
      'totalCharges',v_total,
      'priorPaid',v_prior_paid,
      'pendingExtrasSettled',v_pending_extras,
      'lodgingSettlement',v_lodging_settlement,
      'amountPaid',coalesce(p_amount_paid,0),
      'balance',v_balance
    ),
    'task',to_jsonb(v_task),
    'settlementTransaction',case when v_tx.id is null then null else to_jsonb(v_tx) end
  );
end;
$function$;
