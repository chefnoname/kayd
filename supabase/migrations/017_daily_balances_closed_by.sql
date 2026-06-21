-- Migration 017: Add closed_by to daily_balances
-- Records which staff user closed the day (audit trail).

ALTER TABLE public.daily_balances
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES public.staff_users(id);

COMMENT ON COLUMN public.daily_balances.closed_by
  IS 'Staff user who closed the day — set on EOD submission.';
