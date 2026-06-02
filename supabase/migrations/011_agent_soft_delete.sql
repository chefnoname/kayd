-- 011_agent_soft_delete.sql
-- Soft-delete for agents with audit trail (who deleted, when)

alter table public.agents
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- Index for filtering out deleted agents efficiently
create index if not exists agents_deleted_at_idx on public.agents (deleted_at)
  where deleted_at is null;
