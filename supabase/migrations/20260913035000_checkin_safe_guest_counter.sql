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
  if v_res.status not in ('Pendente','Confirmada') then
    raise exception 'A reserva não está disponível para check-in (status atual: %).', v_res.status;
  end if;

  if v_hotel_date < v_res.check_in_date then
    raise exception 'Check-in disponível somente a partir de %.', to_char(v_res.check_in_date, 'DD/MM/YYYY');
  end if;
  if v_hotel_date >= v_res.check_out_date then
    raise exception 'O período desta reserva já terminou em %. Revise as datas antes do check-in.', to_char(v_res.check_out_date, 'DD/MM/YYYY');
  end if;

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
        when coalesce(p_deposit_amount,0)>=total_nights_amount and coalesce(p_deposit_amount,0)>0 then 'Pago'
        when coalesce(p_deposit_amount,0)>0 then 'Parcial'
        else payment_status
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

  insert into public.kanban_tasks(
    id,title,description,sector,status,priority,room_number,guest_name,
    related_type,related_id,created_at,updated_at
  ) values (
    'task_'||replace(gen_random_uuid()::text,'-',''),
    'Hóspede Instalado - Quarto '||v_room.number||' ('||v_res.guest_name||')',
    'Check-in realizado. Verificar entrega de boas-vindas e preferências.',
    'Governanca','Em_Andamento','Media',v_room.number,v_res.guest_name,
    'Reserva',v_res.id,now(),now()
  )
  returning * into v_task;

  return jsonb_build_object(
    'reservation',to_jsonb(v_res),
    'room',to_jsonb(v_room),
    'task',to_jsonb(v_task),
    'depositTransaction',case when v_tx.id is null then null else to_jsonb(v_tx) end,
    'guestCounterUpdated',v_guest_link_safe
  );
end;
$function$;
