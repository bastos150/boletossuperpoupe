/*
# Link boletos to user profiles for display

1. Altered Tables
- `boletos`: adds a named foreign-key relationship from `user_id` to `user_profiles.id`.
- No existing columns, records, or authentication relationships are removed or changed.

2. Purpose
- Allows the application to show the name and email of the person who created each boleto.
- Keeps the existing relationship from `boletos.user_id` to `auth.users.id` intact.

3. Security
- No RLS policies are changed.
- Existing authenticated access rules remain in effect.

4. Important Notes
- The constraint is added only when it does not already exist, making this migration safe to apply again.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'boletos_user_profiles_fkey'
      AND conrelid = 'public.boletos'::regclass
  ) THEN
    ALTER TABLE public.boletos
      ADD CONSTRAINT boletos_user_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.user_profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;