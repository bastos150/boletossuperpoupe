/*
  Keep delete auditing compatible with the boletos foreign key.
  The deleted boleto ID remains available inside old_values; boleto_id is
  intentionally NULL because the parent row no longer exists after DELETE.
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
  ELSE
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
