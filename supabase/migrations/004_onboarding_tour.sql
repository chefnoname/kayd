-- ============================================================
-- 004: Onboarding tour tracking
-- ============================================================
ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS has_seen_tour boolean NOT NULL DEFAULT false;
