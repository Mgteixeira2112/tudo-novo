-- Govermix — alinha a edição de reservas ao mesmo modelo comercial usado pelo motor de reservas.
-- Não altera assinatura, permissões, identidade do hóspede ou regras de conflito.
-- Substitui somente a validação legada baseada em rooms.capacity por hotel_settings.room_types.

do $$
declare
  v_def text;
  v_old text := $old$
  if (coalesce(p_adults, 0) + coalesce(p_children, 0)) > v_room.capacity then
    raise exception 'A ocupação informada (% hóspede(s)) excede a capacidade do quarto % (% hóspede(s)).',
      (coalesce(p_adults, 0) + coalesce(p_children, 0)), v_room.number, v_room.capacity;
  end if;
$old$;
  v_new text := $new$
  if not exists (
    select 1
    from public.hotel_settings hs
    cross join lateral jsonb_array_elements(coalesce(hs.room_types, '[]'::jsonb)) elem
    where elem->>'id' = v_room.type_id
      and coalesce(p_adults, 0) <= greatest(0, coalesce(nullif(elem->>'capacityAdults', '')::integer, 0))
      and coalesce(p_children, 0) <= greatest(0, coalesce(nullif(elem->>'capacityChildren', '')::integer, 0))
      and (coalesce(p_adults, 0) + coalesce(p_children, 0)) <= greatest(
        1,
        coalesce(
          nullif(elem->>'maxOccupancy', '')::integer,
          greatest(0, coalesce(nullif(elem->>'capacityAdults', '')::integer, 0))
            + greatest(0, coalesce(nullif(elem->>'capacityChildren', '')::integer, 0))
        )
      )
  ) then
    raise exception 'A ocupação informada não é compatível com a capacidade comercial do quarto %.', v_room.number;
  end if;
$new$;
begin
  select pg_get_functiondef(
    'public.update_reservation_atomic(text,text,text,text,date,date,integer,integer,text)'::regprocedure
  ) into v_def;

  if position(v_old in v_def) = 0 then
    raise exception 'Trecho esperado de validação legada não encontrado em update_reservation_atomic.';
  end if;

  execute replace(v_def, v_old, v_new);
end;
$$;
