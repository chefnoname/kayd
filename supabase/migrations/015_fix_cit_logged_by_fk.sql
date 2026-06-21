-- 015_fix_cit_logged_by_fk.sql
-- Fix logged_by FK: point to staff_users(id) instead of auth.users(id)
-- so PostgREST FK-based joins work consistently (matches agent_deposits.recorded_by pattern).

ALTER TABLE public.cit_collections
  DROP CONSTRAINT IF EXISTS cit_collections_logged_by_fkey;

ALTER TABLE public.cit_collections
  ADD CONSTRAINT cit_collections_logged_by_fkey
  FOREIGN KEY (logged_by) REFERENCES public.staff_users(id) ON DELETE SET NULL;
