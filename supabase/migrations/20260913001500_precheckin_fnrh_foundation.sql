-- Fundação mínima para pré-check-in/FNRH.
-- Mantém o perfil permanente em guests e os dados da viagem em reservations.

alter table public.guests
  add column if not exists social_name text,
  add column if not exists nationality text,
  add column if not exists sex text,
  add column if not exists country text,
  add column if not exists address_complement text,
  add column if not exists district text,
  add column if not exists postal_code text;

alter table public.reservations
  add column if not exists travel_reason text,
  add column if not exists travel_origin text,
  add column if not exists next_destination text,
  add column if not exists transport_mode text,
  add column if not exists vehicle_plate text,
  add column if not exists minors_count integer not null default 0,
  add column if not exists legally_incapable_count integer not null default 0,
  add column if not exists responsibility_notes text,
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists pre_checkin_status text not null default 'NaoIniciado',
  add column if not exists pre_checked_in_at timestamptz,
  add column if not exists pre_checkin_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reservations_pre_checkin_status_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_pre_checkin_status_check
      check (pre_checkin_status in ('NaoIniciado', 'EmAndamento', 'Concluido'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reservations_minors_count_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_minors_count_check
      check (minors_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reservations_legally_incapable_count_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_legally_incapable_count_check
      check (legally_incapable_count >= 0);
  end if;
end
$$;

comment on column public.guests.social_name is 'Nome social do hóspede, quando houver.';
comment on column public.guests.nationality is 'Nacionalidade para identificação/FNRH.';
comment on column public.guests.sex is 'Sexo informado para identificação/FNRH.';
comment on column public.guests.country is 'País de residência.';
comment on column public.guests.address_complement is 'Complemento do endereço de residência.';
comment on column public.guests.district is 'Bairro ou distrito de residência.';
comment on column public.guests.postal_code is 'Código postal/CEP de residência.';

comment on column public.reservations.travel_reason is 'Motivo da viagem desta hospedagem.';
comment on column public.reservations.travel_origin is 'Origem imediata da viagem.';
comment on column public.reservations.next_destination is 'Próximo destino, quando houver.';
comment on column public.reservations.transport_mode is 'Meio de transporte desta viagem.';
comment on column public.reservations.vehicle_plate is 'Placa do veículo, quando houver.';
comment on column public.reservations.minors_count is 'Quantidade de menores vinculados ao responsável nesta hospedagem.';
comment on column public.reservations.legally_incapable_count is 'Quantidade de pessoas legalmente incapazes vinculadas nesta hospedagem.';
comment on column public.reservations.responsibility_notes is 'Condição de acompanhamento e autorizações aplicáveis.';
comment on column public.reservations.terms_version is 'Versão dos termos do estabelecimento aceitos no pré-check-in.';
comment on column public.reservations.terms_accepted_at is 'Data/hora do aceite dos termos do estabelecimento.';
comment on column public.reservations.pre_checkin_status is 'Estado interno do pré-check-in: NaoIniciado, EmAndamento ou Concluido.';
comment on column public.reservations.pre_checked_in_at is 'Marco de conclusão do pré-check-in.';
comment on column public.reservations.pre_checkin_updated_at is 'Última atualização dos dados de pré-check-in.';
