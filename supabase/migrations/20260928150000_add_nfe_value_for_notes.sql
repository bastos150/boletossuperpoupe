/*
  Store the NF-e amount separately when a record has no boleto.
  Regular boleto records continue using valor; Nota sem boleto uses valor_nfe.
*/

ALTER TABLE public.boletos
  ADD COLUMN IF NOT EXISTS valor_nfe numeric(12,2);
