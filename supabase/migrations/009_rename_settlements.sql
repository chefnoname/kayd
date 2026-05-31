ALTER TABLE public.settlements RENAME TO agent_deposits;
ALTER TABLE public.agents RENAME COLUMN last_settlement TO last_agent_deposit;

DROP POLICY IF EXISTS "org_read_settlements" ON public.agent_deposits;
DROP POLICY IF EXISTS "org_write_settlements" ON public.agent_deposits;

CREATE POLICY "org_read_agent_deposits" ON public.agent_deposits
  FOR SELECT
  TO authenticated
  USING (organisation_id = public.current_org_id());

CREATE POLICY "org_write_agent_deposits" ON public.agent_deposits
  FOR ALL
  TO authenticated
  USING (organisation_id = public.current_org_id())
  WITH CHECK (organisation_id = public.current_org_id());

DROP INDEX IF EXISTS settlements_agent_idx;
DROP INDEX IF EXISTS settlements_date_idx;
DROP INDEX IF EXISTS settlements_org_idx;
CREATE INDEX IF NOT EXISTS agent_deposits_agent_idx ON public.agent_deposits (agent_id, date DESC);
CREATE INDEX IF NOT EXISTS agent_deposits_date_idx ON public.agent_deposits (date DESC);
CREATE INDEX IF NOT EXISTS agent_deposits_org_idx ON public.agent_deposits (organisation_id);
