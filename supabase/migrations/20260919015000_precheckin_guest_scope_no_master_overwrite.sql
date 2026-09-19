-- Bearer token belongs to ONE reservation; never update hotel-wide guest records.
-- Matched previously-linked guest may be reused read-only; otherwise create new.
DO $preflight$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='complete_reservation_precheckin_public' AND p.pronargs=26;
  IF v_def IS NULL OR (position('order by created_at asc' in lower(v_def))=0 AND position('PRECHECKIN_SCOPED_GUEST_V1' in v_def)=0) THEN
    RAISE EXCEPTION 'Unexpected pre-check-in implementation; review before migrating';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.complete_reservation_precheckin_public(
  p_token text,p_full_name text,p_social_name text,p_birth_date date,
  p_nationality text,p_sex text,p_document_type text,p_document text,
  p_email text,p_phone text,p_country text,p_state text,p_city text,
  p_address text,p_address_complement text,p_district text,p_postal_code text,
  p_travel_reason text,p_travel_origin text,p_next_destination text,
  p_transport_mode text,p_vehicle_plate text,p_minors_count integer,
  p_legally_incapable_count integer,p_responsibility_notes text,
  p_declaration_accepted boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_res public.reservations%rowtype;
  v_guest public.guests%rowtype;
  v_guest_id text;
  v_name text := nullif(trim(coalesce(p_full_name,'')), '');
  v_document text := nullif(trim(coalesce(p_document,'')), '');
  v_email text := nullif(trim(coalesce(p_email,'')), '');
  v_phone text := nullif(trim(coalesce(p_phone,'')), '');
BEGIN
  SELECT * INTO v_res FROM public.reservations
  WHERE pre_checkin_token_hash=encode(digest(p_token,'sha256'),'hex')
    AND pre_checkin_token_expires_at>now() AND status='Confirmada'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link de pré-check-in inválido ou expirado.'; END IF;
  IF v_res.pre_checkin_status='Concluido' THEN
    RETURN jsonb_build_object('status','Concluido','reservation_code',v_res.code,'completed_at',v_res.pre_checked_in_at);
  END IF;

  IF v_name IS NULL OR p_birth_date IS NULL
     OR nullif(trim(coalesce(p_nationality,'')),'') IS NULL
     OR nullif(trim(coalesce(p_sex,'')),'') IS NULL
     OR nullif(trim(coalesce(p_document_type,'')),'') IS NULL
     OR v_document IS NULL OR v_email IS NULL OR v_phone IS NULL
     OR nullif(trim(coalesce(p_country,'')),'') IS NULL
     OR nullif(trim(coalesce(p_city,'')),'') IS NULL
     OR nullif(trim(coalesce(p_address,'')),'') IS NULL
     OR nullif(trim(coalesce(p_postal_code,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Preencha todos os campos obrigatórios do pré-check-in.';
  END IF;
  IF coalesce(p_minors_count,0)<0 OR coalesce(p_legally_incapable_count,0)<0 THEN
    RAISE EXCEPTION 'As quantidades de menores/incapazes não podem ser negativas.';
  END IF;
  IF NOT coalesce(p_declaration_accepted,false) THEN
    RAISE EXCEPTION 'É necessário confirmar a declaração do pré-check-in.';
  END IF;

  -- PRECHECKIN_SCOPED_GUEST_V1: never search the global guest registry.
  -- An existing master profile is read-only for bearer-token holders.
  IF v_res.guest_id IS NOT NULL THEN
    SELECT * INTO v_guest FROM public.guests WHERE id=v_res.guest_id;
    IF FOUND AND v_guest.document IS NOT NULL
      AND trim(v_guest.document)=v_document
      AND lower(trim(v_guest.full_name))=lower(v_name) THEN
      v_guest_id := v_guest.id;
    END IF;
  END IF;
  IF v_guest_id IS NULL THEN
    v_guest_id := 'guest_'||replace(gen_random_uuid()::text,'-','');
    INSERT INTO public.guests (
      id,full_name,social_name,birth_date,nationality,sex,
      document_type,document,email,phone,country,state,city,
      address,address_complement,district,postal_code,status
    ) VALUES (
      v_guest_id,v_name,nullif(trim(coalesce(p_social_name,'')),''),p_birth_date,
      trim(p_nationality),trim(p_sex),trim(p_document_type),v_document,
      v_email,v_phone,trim(p_country),nullif(trim(coalesce(p_state,'')),''),
      trim(p_city),trim(p_address),nullif(trim(coalesce(p_address_complement,'')),''),
      nullif(trim(coalesce(p_district,'')),''),trim(p_postal_code),'Ativo'
    );
  END IF;

  UPDATE public.reservations
  SET guest_id=v_guest_id,guest_name=v_name,guest_email=v_email,
      guest_phone=v_phone,guest_document=v_document,
      travel_reason=nullif(trim(coalesce(p_travel_reason,'')),''),
      travel_origin=nullif(trim(coalesce(p_travel_origin,'')),''),
      next_destination=nullif(trim(coalesce(p_next_destination,'')),''),
      transport_mode=nullif(trim(coalesce(p_transport_mode,'')),''),
      vehicle_plate=nullif(trim(coalesce(p_vehicle_plate,'')),''),
      minors_count=coalesce(p_minors_count,0),
      legally_incapable_count=coalesce(p_legally_incapable_count,0),
      responsibility_notes=nullif(trim(coalesce(p_responsibility_notes,'')),''),
      pre_checkin_status='Concluido',pre_checkin_updated_at=now(),
      pre_checked_in_at=now(),terms_accepted_at=now(),
      terms_version='precheckin-declaration-v1'
  WHERE id=v_res.id;
  RETURN jsonb_build_object('status','Concluido','reservation_code',v_res.code,'guest_id',v_guest_id,'completed_at',now());
END;
$function$;

-- Keep existing EXECUTE grants; fail if public/internal access changes unexpectedly.
DO $verify$
DECLARE v_proc oid; v_def text;
BEGIN
  SELECT p.oid,pg_get_functiondef(p.oid) INTO v_proc,v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='complete_reservation_precheckin_public' AND p.pronargs=26;
  IF v_proc IS NULL OR position('PRECHECKIN_SCOPED_GUEST_V1' in v_def)=0
    OR position('UPDATE public.guests' in v_def)>0
    OR position('order by created_at asc' in lower(v_def))>0
    OR NOT has_function_privilege('anon',v_proc,'EXECUTE')
    OR NOT has_function_privilege('authenticated',v_proc,'EXECUTE')
    OR NOT has_function_privilege('service_role',v_proc,'EXECUTE') THEN
    RAISE EXCEPTION 'Precheckin scope or EXECUTE privilege regression';
  END IF;
END;
$verify$;
