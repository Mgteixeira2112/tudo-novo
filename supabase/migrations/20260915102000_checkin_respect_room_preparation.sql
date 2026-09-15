-- Check-in: não cria tarefa genérica de Governança quando a última preparação do quarto
-- já contém todos os amenities exigidos para a reserva atual.
-- Quando há padrão configurado, mas a última preparação está incompleta, cria tarefa específica
-- listando somente as pendências. Sem padrão configurado, preserva o comportamento anterior.

create or replace function public.process_checkin_atomic(
  p_reservation_id text,
  p_room_id text,
  p_deposit_amount numeric default 0,
  p_payment_method text default null::text,
  p_key_card_number text default null::text,
  p_notes text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
set timezone to 'America/Sao_Paulo'
as $function$
declare
  v_res public.reservations%rowtype;
  v_room public.rooms%rowtype;
  v_task public.kanban_tasks%rowtype;
  v_tx public.financial_transactions%rowtype;
  v_guest public.guests%rowtype;
  v_note text;
  v_hotel_date date := (timezone('America/Sao_Paulo', now()))::date;
  v_guest_link_safe boolean := false;
  v_has_comparable_contact boolean := false;
  v_prior_paid numeric := 0;
  v_remaining_balance numeric := 0;
  v_total_paid numeric := 0;
  v_guest_count integer := 0;
  v_kit_id text;
  v_preparation_task_id text;
  v_preparation_complete boolean := false;
  v_missing_count integer := 0;
  v_missing_summary text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para realizar check-in.' using errcode = '42501';
  end if;

  if coalesce(p_deposit_amount,0) < 0 then
    raise exception 'O valor do depósito não pode ser negativo.';
  end if;

  if coalesce(p_deposit_amount,0) > 0 and coalesce(nullif(trim(p_payment_method),''),'') not in ('PIX','Cartao_Credito','Cartao_Debito','Dinheiro') then
    raise exception 'Selecione uma forma de pagamento válida para o valor recebido no check-in.' using errcode = '22023';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if v_res.status <> 'Confirmada' then
    raise exception 'Somente reservas confirmadas podem realizar check-in (status atual: %).', v_res.status;
  end if;

  if v_hotel_date < v_res.check_in_date then
    raise exception 'Check-in disponível somente a partir de %.', to_char(v_res.check_in_date, 'DD/MM/YYYY');
  end if;
  if v_hotel_date >= v_res.check_out_date then
    raise exception 'O período desta reserva já terminou em %. Revise as datas antes do check-in.', to_char(v_res.check_out_date, 'DD/MM/YYYY');
  end if;

  select coalesce(sum(ft.amount),0)
    into v_prior_paid
  from public.financial_transactions ft
  where ft.reservation_id = v_res.id
    and ft.type = 'Receita'
    and ft.status = 'Pago';

  v_remaining_balance := greatest(coalesce(v_res.total_nights_amount,0) - v_prior_paid, 0);

  if coalesce(p_deposit_amount,0) > v_remaining_balance then
    raise exception 'O valor recebido (%) excede o saldo restante da hospedagem (%).',
      to_char(coalesce(p_deposit_amount,0), 'FM999999990D00'),
      to_char(v_remaining_balance, 'FM999999990D00')
      using errcode = '22023';
  end if;

  v_total_paid := v_prior_paid + coalesce(p_deposit_amount,0);

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Quarto não encontrado.'; end if;
  if v_room.status <> 'Disponivel' then
    raise exception 'O quarto % não está disponível para check-in (status: %).', v_room.number, v_room.status;
  end if;
  if v_room.type_name <> v_res.room_type_name then
    raise exception 'O quarto selecionado não pertence à categoria reservada (%).', v_res.room_type_name;
  end if;

  if exists (
    select 1 from public.reservations r
    where r.id <> v_res.id
      and r.room_id = v_room.id
      and r.status in ('Pendente','Confirmada','CheckIn')
      and daterange(r.check_in_date, r.check_out_date, '[)') && daterange(v_res.check_in_date, v_res.check_out_date, '[)')
  ) then
    raise exception 'O quarto % possui outra reserva ativa no período.', v_room.number;
  end if;

  -- Avalia a preparação antes de alterar a reserva/quarto.
  -- O ciclo válido é sempre a última tarefa RoomCleaning concluída do próprio quarto.
  v_guest_count := coalesce(v_res.adults, 0) + coalesce(v_res.children, 0);

  select k.id
    into v_kit_id
  from public.room_amenity_kits k
  where k.room_type_id = v_room.type_id
    and k.active = true
    and k.name = 'Padrão de Preparação'
  order by k.updated_at desc, k.created_at desc
  limit 1;

  select kt.id
    into v_preparation_task_id
  from public.kanban_tasks kt
  where kt.related_type = 'RoomCleaning'
    and kt.related_id = v_room.id
    and kt.status = 'Concluido'
    and kt.completed_at is not null
  order by kt.completed_at desc
  limit 1;

  if v_kit_id is not null
     and v_preparation_task_id is not null
     and exists (select 1 from public.room_amenity_kit_items ki where ki.kit_id = v_kit_id) then

    with required as (
      select
        ki.inventory_item_id,
        ii.name,
        case
          when ki.quantity_basis = 'per_guest' then ki.quantity * v_guest_count
          else ki.quantity
        end as required_quantity
      from public.room_amenity_kit_items ki
      join public.inventory_items ii on ii.id = ki.inventory_item_id
      where ki.kit_id = v_kit_id
    ), consumed as (
      select
        sm.item_id as inventory_item_id,
        coalesce(sum(sm.quantity), 0) as consumed_quantity
      from public.stock_movements sm
      where sm.related_task_id = v_preparation_task_id
        and sm.type = 'Saida_Consumo_Interno'
      group by sm.item_id
    ), missing as (
      select
        r.inventory_item_id,
        r.name,
        r.required_quantity,
        coalesce(c.consumed_quantity, 0) as consumed_quantity,
        greatest(r.required_quantity - coalesce(c.consumed_quantity, 0), 0) as missing_quantity
      from required r
      left join consumed c using (inventory_item_id)
      where coalesce(c.consumed_quantity, 0) < r.required_quantity
    )
    select
      count(*),
      string_agg(format('%s: falta %s', name, trim(to_char(missing_quantity, 'FM999999990D##'))), '; ' order by name)
      into v_missing_count, v_missing_summary
    from missing;

    v_preparation_complete := v_missing_count = 0;
  end if;

  v_note := nullif(trim(coalesce(p_notes,'')), '');
  if nullif(trim(coalesce(p_key_card_number,'')), '') is not null then
    v_note := concat_ws(' | ', v_note, 'Chave/Cartão: ' || trim(p_key_card_number));
  end if;

  if v_res.guest_id is not null then
    select * into v_guest from public.guests where id = v_res.guest_id;
    if found then
      v_has_comparable_contact :=
        (nullif(trim(coalesce(v_guest.email,'')), '') is not null and nullif(trim(coalesce(v_res.guest_email,'')), '') is not null)
        or
        (nullif(regexp_replace(coalesce(v_guest.phone,''), '[^0-9]', '', 'g'), '') is not null and nullif(regexp_replace(coalesce(v_res.guest_phone,''), '[^0-9]', '', 'g'), '') is not null);

      v_guest_link_safe :=
        lower(trim(coalesce(v_guest.full_name,''))) = lower(trim(coalesce(v_res.guest_name,'')))
        and (
          not v_has_comparable_contact
          or (
            nullif(trim(coalesce(v_guest.email,'')), '') is not null
            and nullif(trim(coalesce(v_res.guest_email,'')), '') is not null
            and lower(trim(v_guest.email)) = lower(trim(v_res.guest_email))
          )
          or (
            nullif(regexp_replace(coalesce(v_guest.phone,''), '[^0-9]', '', 'g'), '') is not null
            and nullif(regexp_replace(coalesce(v_res.guest_phone,''), '[^0-9]', '', 'g'), '') is not null
            and regexp_replace(v_guest.phone, '[^0-9]', '', 'g') = regexp_replace(v_res.guest_phone, '[^0-9]', '', 'g')
          )
        );
    end if;
  end if;

  update public.reservations
  set status='CheckIn',
      checked_in_at=now(),
      room_id=v_room.id,
      room_number=v_room.number,
      notes=case when v_note is null then notes else concat_ws(' | ', nullif(notes,''), v_note) end,
      payment_method=case
        when coalesce(p_deposit_amount,0)>0 then p_payment_method
        else payment_method
      end,
      payment_status=case
        when coalesce(total_nights_amount,0) > 0 and v_total_paid >= total_nights_amount then 'Pago'
        when v_total_paid > 0 then 'Parcial'
        else 'Pendente'
      end
  where id=v_res.id
  returning * into v_res;

  update public.rooms
  set status='Ocupado',
      current_reservation_id=v_res.id,
      current_guest_name=v_res.guest_name,
      notes=case when v_note is null then notes else concat_ws(' | ', nullif(notes,''), v_note) end
  where id=v_room.id
  returning * into v_room;

  if coalesce(p_deposit_amount,0)>0 then
    insert into public.financial_transactions(
      id,type,category,description,amount,payment_method,status,
      reservation_id,room_number,guest_name,date,created_at
    ) values (
      'tx_'||replace(gen_random_uuid()::text,'-',''),
      'Receita','Diarias',
      'Depósito/Entrada Check-in ('||v_res.code||') - '||v_res.guest_name||' - Quarto '||v_room.number,
      p_deposit_amount,
      p_payment_method,
      'Pago',v_res.id,v_room.number,v_res.guest_name,current_date,now()
    )
    returning * into v_tx;
  end if;

  if v_res.guest_id is not null and v_guest_link_safe then
    update public.guests
    set total_stays=coalesce(total_stays,0)+1, updated_at=now()
    where id=v_res.guest_id;
  end if;

  if not v_preparation_complete then
    insert into public.kanban_tasks(
      id,title,description,sector,status,priority,room_number,guest_name,
      related_type,related_id,created_at,updated_at
    ) values (
      'task_'||replace(gen_random_uuid()::text,'-',''),
      case
        when v_kit_id is not null and v_preparation_task_id is not null and v_missing_count > 0
          then 'Pendência de Preparação - Quarto '||v_room.number||' ('||v_res.guest_name||')'
        else 'Hóspede Instalado - Quarto '||v_room.number||' ('||v_res.guest_name||')'
      end,
      case
        when v_kit_id is not null and v_preparation_task_id is not null and v_missing_count > 0
          then 'Check-in realizado com amenities pendentes no ciclo atual. '||coalesce(v_missing_summary,'Revisar preparação do quarto.')
        else 'Check-in realizado. Verificar entrega de boas-vindas e preferências.'
      end,
      'Governanca','Em_Andamento',
      case when v_missing_count > 0 then 'Alta' else 'Media' end,
      v_room.number,v_res.guest_name,
      'Reserva',v_res.id,now(),now()
    )
    returning * into v_task;
  end if;

  return jsonb_build_object(
    'reservation',to_jsonb(v_res),
    'room',to_jsonb(v_room),
    'task',case when v_task.id is null then null else to_jsonb(v_task) end,
    'depositTransaction',case when v_tx.id is null then null else to_jsonb(v_tx) end,
    'guestCounterUpdated',v_guest_link_safe,
    'priorPaid',v_prior_paid,
    'remainingBalanceBeforeCheckIn',v_remaining_balance,
    'totalPaidAfterCheckIn',v_total_paid,
    'roomPreparationComplete',v_preparation_complete,
    'roomPreparationTaskId',v_preparation_task_id,
    'roomPreparationMissing',coalesce(v_missing_summary,''),
    'governanceTaskCreated',v_task.id is not null
  );
end;
$function$;

revoke all on function public.process_checkin_atomic(text,text,numeric,text,text,text) from public, anon;
grant execute on function public.process_checkin_atomic(text,text,numeric,text,text,text) to authenticated;
