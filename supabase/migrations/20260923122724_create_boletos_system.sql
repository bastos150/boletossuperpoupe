/*
# Create boletos system with authentication, audit logging, and admin user management

## Overview
This migration creates the complete database schema for the SuperPoupe boleto management system.
It supports authenticated users (max 4), boletos linked to the user who created them,
an audit log for tracking changes, and a user_profiles table for admin flags.

## New Tables

### 1. user_profiles
- `id` (uuid, PK, references auth.users) — links to Supabase auth
- `email` (text) — cached email for display
- `nome` (text) — display name
- `is_admin` (boolean, default false) — whether this user can manage other users
- `created_at` (timestamptz) — when the profile was created

### 2. boletos
- `id` (uuid, PK) — unique boleto ID
- `empresa` (text, not null) — company name
- `cnpj` (text) — CNPJ
- `nfe` (text) — NF-e number
- `numero` (text, not null) — boleto number
- `valor` (numeric, not null) — boleto value
- `data_lancamento` (date, not null) — auto-filled launch date
- `data_vencimento` (date, not null) — due date
- `status` (text, not null, default 'Lançado') — status
- `responsavel` (text, not null) — responsible person
- `observacoes` (text) — notes
- `user_id` (uuid, not null, references auth.users) — who created the boleto
- `created_at` (timestamptz) — record creation time
- `updated_at` (timestamptz) — last update time
- `updated_by` (uuid, references auth.users) — who last modified the record

### 3. boleto_audit
- `id` (uuid, PK) — audit entry ID
- `boleto_id` (uuid, references boletos) — which boleto was changed
- `user_id` (uuid, references auth.users) — who made the change
- `action` (text) — 'insert', 'update', 'delete', or 'status_change'
- `old_values` (jsonb) — previous values
- `new_values` (jsonb) — new values
- `created_at` (timestamptz) — when the change happened

## Security (RLS)

### user_profiles
- SELECT: authenticated users can read all profiles (to see who created boletos)
- UPDATE: users can update their own profile; admins can update any profile
- INSERT: only via trigger (auto-created on signup), not directly

### boletos
- SELECT: all authenticated users can see all boletos (team visibility)
- INSERT: authenticated users can insert boletos for themselves
- UPDATE: authenticated users can update any boleto (team editing)
- DELETE: authenticated users can delete any boleto

### boleto_audit
- SELECT: authenticated users can read audit entries
- INSERT: authenticated users can insert audit entries
- No UPDATE or DELETE — audit log is immutable

## Triggers
- Auto-create user_profiles on auth.users insert
- Auto-update updated_at on boletos update

## Important Notes
1. The boletos table uses DEFAULT auth.uid() for user_id so inserts work without passing it
2. All authenticated users can see all boletos (team visibility requirement)
3. All authenticated users can edit/delete boletos (team editing requirement)
4. The audit log records who made each change
5. The user_profiles trigger auto-creates a profile when a new auth user signs up
*/

-- ============================================================
-- 1. user_profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text NOT NULL DEFAULT '',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON user_profiles;
CREATE POLICY "profiles_select_all"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON user_profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- ============================================================
-- 2. boletos table
-- ============================================================
CREATE TABLE IF NOT EXISTS boletos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa text NOT NULL,
  cnpj text DEFAULT '',
  nfe text DEFAULT '',
  numero text NOT NULL,
  valor numeric(12,2) NOT NULL,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'Lançado',
  responsavel text NOT NULL,
  observacoes text DEFAULT '',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boletos_select_all" ON boletos;
CREATE POLICY "boletos_select_all"
  ON boletos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "boletos_insert_own" ON boletos;
CREATE POLICY "boletos_insert_own"
  ON boletos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "boletos_update_all" ON boletos;
CREATE POLICY "boletos_update_all"
  ON boletos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "boletos_delete_all" ON boletos;
CREATE POLICY "boletos_delete_all"
  ON boletos FOR DELETE
  TO authenticated
  USING (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_boletos_user_id ON boletos(user_id);
CREATE INDEX IF NOT EXISTS idx_boletos_status ON boletos(status);
CREATE INDEX IF NOT EXISTS idx_boletos_data_vencimento ON boletos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_boletos_empresa ON boletos(empresa);

-- ============================================================
-- 3. boleto_audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS boleto_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_id uuid REFERENCES boletos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE boleto_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_all" ON boleto_audit;
CREATE POLICY "audit_select_all"
  ON boleto_audit FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "audit_insert_all" ON boleto_audit;
CREATE POLICY "audit_insert_all"
  ON boleto_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 4. Trigger: auto-create user_profiles on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. Trigger: auto-update updated_at on boletos
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS boletos_update_timestamp ON boletos;
CREATE TRIGGER boletos_update_timestamp
  BEFORE UPDATE ON boletos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. Trigger: auto-insert audit entries on boletos changes
-- ============================================================
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
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_old := null;
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_new := null;
  END IF;

  INSERT INTO public.boleto_audit (boleto_id, user_id, action, old_values, new_values)
  VALUES (COALESCE(NEW.id, OLD.id), auth.uid(), v_action, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS boletos_audit_insert ON boletos;
CREATE TRIGGER boletos_audit_insert
  AFTER INSERT ON boletos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_boleto_changes();

DROP TRIGGER IF EXISTS boletos_audit_update ON boletos;
CREATE TRIGGER boletos_audit_update
  AFTER UPDATE ON boletos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_boleto_changes();

DROP TRIGGER IF EXISTS boletos_audit_delete ON boletos;
CREATE TRIGGER boletos_audit_delete
  AFTER DELETE ON boletos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_boleto_changes();
