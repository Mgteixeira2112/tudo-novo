create or replace function public.process_walkin_atomic(
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_document text,
  p_document_type text,
  p_room_id text,
  p_check_out_date date,
  p_adults integer,
  p_children integer,
  p_payment_method text,
  p_deposit_amount numeric default 0,
  p_key_card_number text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_guest public.guests%rowtype;
  v_res public.reservations%rowtype;
  v_task public.kanban_tasks%rowtype;
  v_tx public.financial_transactions%rowtype;
  v_today date := current_date;
  v_nights integer;
  v_total numeric;
  v_note text;
  v_res_id text;
  v_code text;
  v_guest_id text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (s.role = 'admin' or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout')
  ) then
    raise exception 'Permissão insuficiente para realizar check-in direto.' using errcode = '42501';
  end if;

  if p_guest_name is null or length(trim(p_guest_name)) < 2 or length(trim(p_guest_name)) > 120 then
    raise exception 'Nome do hóspede inválido.' using errcode = '22023';
  end if;
  if p_guest_email is null or length(trim(p_guest_email)) > 254 or position('@' in p_guest_email) < 2 then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if p_guest_phone is null or length(trim(p_guest_phone)) < 5 or length(trim(p_guest_phone)) > 40 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if p_room_id is null or length(trim(p_room_id)) = 0 then
    raise exception 'Quarto inválido.' using errcode = '22023';
  end if;
  if p_check_out_date is null or p_check_out_date <= v_today then
    raise exception 'A data de saída deve ser posterior à data de hoje.' using errcode = '22023';
  end if;

  v_nights := p_check_out_date - v_today;
  if v_nights < 1 or v_nights > 60 then
    raise exception 'A hospedagem deve ter entre 1 e 60 noites.' using errcode = '22023';
  end if;
  if p_adults < 1 or p_adults > 10 or p_children < 0 or p_children > 10 then
    raise exception 'Quantidade de hóspedes inválida.' using errcode = '22023';
  end if;
  if p_payment_method not in ('PIX','Cartao_Credito','Cartao_Debito','Dinheiro') then
    raise exception 'Forma de pagamento não permitida.' using errcode = '22023';
  end if;
  if coalesce(p_deposit_amount, 0) < 0 then
    raise exception 'O valor do pagamento não pode ser negativo.' using errcode = '22023';
  end if;

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'Quarto não encontrado.';
  end if;
  if v_room.status <> 'Disponivel' then
    raise exception 'O quarto % não está disponível para check-in (status: %).', v_room.number, v_room.status;
  end if;
  if v_room.capacity < (p_adults + p_children) then
    raise exception 'A capacidade do quarto % é insuficiente para % hóspedes.', v_room.number, (p_adults + p_children);
  end if;
  if exists (
    select 1
    from public.reservations r
    where r.room_id = v_room.id
      and r.status in ('Pendente','Confirmada','CheckIn')
      and daterange(r.check_in_date, r.check_out_date, '[)') && daterange(v_today, p_check_out_date, '[)')
  ) then
    raise exception 'O quarto % possui reserva ativa no período informado.', v_room.number;
  end if;

  select * into v_guest
  from public.guests g
  where (
      nullif(trim(coalesce(p_document, '')), '') is not null
      and nullif(trim(coalesce(g.document, '')), '') = trim(p_document)
    )
    or lower(coalesce(g.email, '')) = lower(trim(p_guest_email))
  order by case when nullif(trim(coalesce(p_document, '')), '') is not null and g.document = trim(p_document) then 0 else 1 end
  limit 1
  for update;

  if found then
    update public.guests
    set full_name = trim(p_guest_name),
        email = lower(trim(p_guest_email)),
        phone = trim(p_guest_phone),
        document = coalesce(nullif(trim(coalesce(p_document, '')), ''), document),
        document_type = coalesce(nullif(trim(coalesce(p_document_type, '')), ''), document_type),
        total_stays = coalesce(total_stays, 0) + 1,
        updated_at = now()
    where id = v_guest.id
    returning * into v_guest;
  else
    v_guest_id := 'guest_' || replace(gen_random_uuid()::text, '-', '');
    insert into public.guests(
      id, full_name, document, document_type, email, phone,
      status, total_stays, total_spent, created_at, updated_at
    ) values (
      v_guest_id, trim(p_guest_name), nullif(trim(coalesce(p_document, '')), ''),
      coalesce(nullif(trim(coalesce(p_document_type, '')), ''), 'CPF'),
      lower(trim(p_guest_email)), trim(p_guest_phone),
      'Ativo', 1, 0, now(), now()
    ) returning * into v_guest;
  end if;

  v_total := v_room.price_per_night * v_nights;
  v_note := nullif(trim(coalesce(p_notes, '')), '');
  if nullif(trim(coalesce(p_key_card_number, '')), '') is not null then
    v_note := concat_ws(' | ', v_note, 'Chave/Cartão: ' || trim(p_key_card_number));
  end if;
  v_note := concat_ws(' | ', 'Walk-in / Balcão', v_note);

  v_res_id := 'res_' || replace(gen_random_uuid()::text, '-', '');
  v_code := 'NH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.reservations(
    id, code, guest_id, guest_name, guest_email, guest_phone,
    room_id, room_number, room_type_name, check_in_date, check_out_date,
    nights, adults, children, price_per_night, total_nights_amount,
    status, payment_status, payment_method, notes, created_at, checked_in_at
  ) values (
    v_res_id, v_code, v_guest.id, v_guest.full_name, v_guest.email, v_guest.phone,
    v_room.id, v_room.number, v_room.type_name, v_today, p_check_out_date,
    v_nights, p_adults, p_children, v_room.price_per_night, v_total,
    'CheckIn',
    case
      when coalesce(p_deposit_amount,0) >= v_total and coalesce(p_deposit_amount,0) > 0 then 'Pago'
      when coalesce(p_deposit_amount,0) > 0 then 'Parcial'
      else 'Pendente'
    end,
    p_payment_method, v_note, now(), now()
  ) returning * into v_res;

  update public.rooms
  set status = 'Ocupado',
      current_reservation_id = v_res.id,
      current_guest_name = v_res.guest_name,
      notes = case when v_note is null then notes else concat_ws(' | ', nullif(notes,''), v_note) end
  where id = v_room.id
  returning * into v_room;

  if coalesce(p_deposit_amount,0) > 0 then
    insert into public.financial_transactions(
      id, type, category, description, amount, payment_method, status,
      reservation_id, room_number, guest_name, date, created_at
    ) values (
      'tx_' || replace(gen_random_uuid()::text, '-', ''),
      'Receita', 'Diarias',
      'Pagamento Check-in Walk-in (' || v_res.code || ') - ' || v_res.guest_name || ' - Quarto ' || v_room.number,
      p_deposit_amount, p_payment_method, 'Pago',
      v_res.id, v_room.number, v_res.guest_name, current_date, now()
    ) returning * into v_tx;
  end if;

  insert into public.kanban_tasks(
    id, title, description, sector, status, priority,
    room_number, guest_name, related_type, related_id, created_at, updated_at
  ) values (
    'task_' || replace(gen_random_uuid()::text, '-', ''),
    'Hóspede Instalado - Quarto ' || v_room.number || ' (' || v_res.guest_name || ')',
    'Check-in direto realizado no balcão. Verificar boas-vindas e preferências.',
    'Governanca', 'Em_Andamento', 'Media',
    v_room.number, v_res.guest_name, 'Reserva', v_res.id, now(), now()
  ) returning * into v_task;

  return jsonb_build_object(
    'reservation', to_jsonb(v_res),
    'room', to_jsonb(v_room),
    'guest', to_jsonb(v_guest),
    'task', to_jsonb(v_task),
    'depositTransaction', case when v_tx.id is null then null else to_jsonb(v_tx) end
  );
end;
$$;

revoke all on function public.process_walkin_atomic(text,text,text,text,text,text,date,integer,integer,text,numeric,text,text) from public;
revoke all on function public.process_walkin_atomic(text,text,text,text,text,text,date,integer,integer,text,numeric,text,text) from anon;
grant execute on function public.process_walkin_atomic(text,text,text,text,text,text,date,integer,integer,text,numeric,text,text) to authenticated;
