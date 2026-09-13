-- Preserve the reservation's existing payment method when checkout settles no new amount.
-- This avoids replacing the real payment method with the UI default on zero-balance checkout.

do $$
declare
  v_definition text;
  v_old text := E'payment_status=''Pago'',\n      payment_method=p_payment_method,\n      checked_out_at=now(),';
  v_new text := E'payment_status=''Pago'',\n      payment_method=case\n        when coalesce(p_amount_paid,0)>0 then p_payment_method\n        else payment_method\n      end,\n      checked_out_at=now(),';
begin
  select pg_get_functiondef('public.process_checkout_atomic(text,text,numeric,numeric,text,text)'::regprocedure)
    into v_definition;

  if position(v_old in v_definition)=0 then
    raise exception 'Trecho esperado de process_checkout_atomic não encontrado; migration interrompida por segurança.';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end
$$;
