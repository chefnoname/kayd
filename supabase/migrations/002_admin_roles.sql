-- ============================================================
-- 002: Add superadmin role + role trigger
-- ============================================================

-- Expand the allowed role values to include 'superadmin'
ALTER TABLE public.staff_users 
  DROP CONSTRAINT IF EXISTS staff_users_role_check;

ALTER TABLE public.staff_users 
  ADD CONSTRAINT staff_users_role_check 
  CHECK (role IN ('superadmin', 'admin', 'staff'));

-- Add invited_by to track who invited each user
ALTER TABLE public.staff_users 
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.staff_users (id) ON DELETE SET NULL;

-- ============================================================
-- Trigger: auto-create staff_users row when a user is created
-- via invite. Reads role + name from auth.users.raw_user_meta_data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_users (id, email, name, role, invited_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    (NEW.raw_user_meta_data->>'invited_by')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name  = COALESCE(EXCLUDED.name, public.staff_users.name);
  RETURN NEW;
END;
$$;

-- Drop if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
