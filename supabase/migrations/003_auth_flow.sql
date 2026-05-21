-- ============================================================
-- 003: Auth flow updates
--   • Add status (active/inactive) + last_active_at + onboarded_at
--     to staff_users
--   • Public signup → role = 'admin'
--   • Invited user → role from metadata (defaults to 'staff')
-- ============================================================

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive'));

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- ------------------------------------------------------------
-- Replace handle_new_user trigger
--
-- Behaviour:
--   • If invited_by is present in metadata  → use metadata role
--     (defaults to 'staff'). This is the admin-invite flow.
--   • Otherwise                              → role = 'admin'.
--     This is the public /signup flow — every new public signup
--     becomes an admin for their own organisation.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_invited_by uuid;
  meta_role       text;
  meta_name       text;
  resolved_role   text;
BEGIN
  meta_invited_by := NULLIF(NEW.raw_user_meta_data->>'invited_by', '')::uuid;
  meta_role       := NEW.raw_user_meta_data->>'role';
  meta_name       := NEW.raw_user_meta_data->>'name';

  IF meta_invited_by IS NOT NULL THEN
    -- Admin-invited user: honour metadata role, default to staff.
    resolved_role := COALESCE(meta_role, 'staff');
    -- Admins can never create other admins via this trigger.
    IF resolved_role NOT IN ('admin', 'staff', 'superadmin') THEN
      resolved_role := 'staff';
    END IF;
  ELSE
    -- Public signup: every new account is an admin for their org.
    resolved_role := 'admin';
  END IF;

  INSERT INTO public.staff_users (id, email, name, role, invited_by, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta_name, split_part(NEW.email, '@', 1)),
    resolved_role,
    meta_invited_by,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name  = COALESCE(EXCLUDED.name, public.staff_users.name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- Mirror auth.users.last_sign_in_at into staff_users.last_active_at
-- so the team page can show "Last Active" without needing service-role.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_sign_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.staff_users
       SET last_active_at = NEW.last_sign_in_at
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_sign_in();
