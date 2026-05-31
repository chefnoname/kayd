ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS sort_code TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff_users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "organisations_update_admin" ON public.organisations;
CREATE POLICY "organisations_update_admin" ON public.organisations
  FOR UPDATE
  TO authenticated
  USING (
    id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  )
  WITH CHECK (
    id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  );
