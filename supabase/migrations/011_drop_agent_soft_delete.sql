-- 011_drop_agent_soft_delete.sql
-- Switch agents from soft-delete to hard-delete: remove soft-delete columns.

ALTER TABLE public.agents DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.agents DROP COLUMN IF EXISTS deleted_by;
DROP INDEX IF EXISTS agents_deleted_at_idx;
