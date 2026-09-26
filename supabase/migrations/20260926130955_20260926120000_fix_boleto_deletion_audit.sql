/*
# Fix boleto deletion blocked by audit trigger

1. Modified Functions
- `log_boleto_changes()`: on DELETE, sets `boleto_id` to NULL instead of `OLD.id`.
  The boleto row no longer exists when the AFTER DELETE trigger fires, so inserting
  a non-null `boleto_id` violates the foreign key constraint and rolls back the
  entire deletion. Setting it to NULL preserves the audit trail without blocking.

2. No Tables or Columns Changed
- Schema stays the same; only the trigger function body is updated.

3. Security
- No RLS or policy changes.
*/

CREATE OR REPLACE FUNCTION public.log_boleto_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_old jsonb;
  v_new jsonb;
  v_boleto_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_old := null;
    v_new := to_jsonb(NEW);
    v_boleto_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_boleto_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_new := null;
    v_boleto_id := null;
  END IF;

  INSERT INTO public.boleto_audit (boleto_id, user_id, action, old_values, new_values)
  VALUES (v_boleto_id, auth.uid(), v_action, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;