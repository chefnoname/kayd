-- Migration 018: Add session_timeout_minutes to organisations
-- Allows superadmins to configure per-org inactivity timeout.
-- NULL means "use the application default constant".

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS session_timeout_minutes integer;

COMMENT ON COLUMN public.organisations.session_timeout_minutes
  IS 'Per-org inactivity timeout override (minutes). NULL = use app default.';
