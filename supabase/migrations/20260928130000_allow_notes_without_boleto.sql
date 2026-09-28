/*
  Allow records marked as "Nota sem boleto" to omit boleto-only fields.
  The application sends NULL for number, value, and due date in this case.
  Responsável is no longer collected by the application and is optional for
  new records while historical values remain intact.
*/

ALTER TABLE public.boletos
  ALTER COLUMN numero DROP NOT NULL,
  ALTER COLUMN valor DROP NOT NULL,
  ALTER COLUMN data_vencimento DROP NOT NULL,
  ALTER COLUMN responsavel DROP NOT NULL;
