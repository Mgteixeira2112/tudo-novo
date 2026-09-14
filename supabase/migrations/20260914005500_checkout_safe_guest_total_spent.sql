-- Protege guests.total_spent contra reservas historicamente vinculadas ao hóspede errado.
-- Reaproveita a mesma regra conservadora já usada no check-in:
-- nome exato normalizado e, quando houver contato comparável, ao menos e-mail ou telefone coincidente.
-- O checkout continua normalmente mesmo com vínculo inconsistente; apenas o acumulador do cadastro não é alterado.

do $migration$
declare
  v_def text;
begin
  select pg_get_functiondef(
    'public.process_checkout_atomic(text,text,numeric,numeric,text,text)'::regprocedure
  ) into v_def;

  if position('v_tx public.financial_transactions%rowtype;' in v_def) = 0 then
    raise exception 'process_checkout_atomic inesperada: declaração de v_tx não encontrada';
  end if;

  v_def := replace(
    v_def,
    $old_decl$  v_tx public.financial_transactions%rowtype;
  v_nights numeric:=0;$old_decl$,
    $new_decl$  v_tx public.financial_transactions%rowtype;
  v_guest public.guests%rowtype;
  v_guest_link_safe boolean:=false;
  v_has_comparable_contact boolean:=false;
  v_nights numeric:=0;$new_decl$
  );

  if position('v_guest_link_safe boolean:=false;' in v_def) = 0 then
    raise exception 'Falha ao inserir variáveis de validação segura no checkout';
  end if;

  v_def := replace(
    v_def,
    $old_guard$  if v_res.room_id is null then raise exception 'Reserva sem quarto vinculado.'; end if;

  select * into v_room$old_guard$,
    $new_guard$  if v_res.room_id is null then raise exception 'Reserva sem quarto vinculado.'; end if;

  if v_res.guest_id is not null then
    select * into v_guest
    from public.guests
    where id=v_res.guest_id;

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

  select * into v_room$new_guard$
  );

  if position('v_guest_link_safe :=' in v_def) = 0 then
    raise exception 'Falha ao inserir validação de identidade no checkout';
  end if;

  v_def := replace(
    v_def,
    $old_update$  if v_res.guest_id is not null then
    update public.guests
    set total_spent=coalesce(total_spent,0)+v_total,
        updated_at=now()
    where id=v_res.guest_id;
  end if;$old_update$,
    $new_update$  if v_res.guest_id is not null and v_guest_link_safe then
    update public.guests
    set total_spent=coalesce(total_spent,0)+v_total,
        updated_at=now()
    where id=v_res.guest_id;
  end if;$new_update$
  );

  if position('if v_res.guest_id is not null and v_guest_link_safe then' in v_def) = 0 then
    raise exception 'Falha ao proteger atualização de total_spent no checkout';
  end if;

  execute v_def;
end;
$migration$;
