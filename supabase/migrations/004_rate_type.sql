-- ============================================================
-- 004: Add rate_type to agent_deposits
--   • Tracks whether the Send or Receive rate was applied
--   • Existing rows default to 'receive' (daily GBP→USD rate)
-- ============================================================

ALTER TABLE public.agent_deposits
  ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'receive'
    CHECK (rate_type IN ('send', 'receive'));
