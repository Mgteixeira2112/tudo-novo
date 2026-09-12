-- Revisão final da Recepção — padroniza a data operacional no timezone do hotel.
-- Não altera regras dos fluxos; apenas garante que current_date dentro das RPCs
-- represente America/Sao_Paulo, inclusive próximo à virada do dia em UTC.

alter function public.process_checkin_atomic(text,text,numeric,text,text,text)
  set timezone to 'America/Sao_Paulo';

alter function public.process_checkout_atomic(text,text,numeric,numeric,text,text)
  set timezone to 'America/Sao_Paulo';

alter function public.process_walkin_atomic(text,text,text,text,text,text,date,integer,integer,text,numeric,text,text)
  set timezone to 'America/Sao_Paulo';
