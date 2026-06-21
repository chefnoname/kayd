-- 013_rate_entries.sql
-- Stores user-submitted send and receive rates for the daily rate gate.
-- Each row is an audit-trail entry: who submitted, when, and for which org.

CREATE TABLE public.rate_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  date             date NOT NULL,
  send_rate        numeric(12, 6) NOT NULL CHECK (send_rate > 0),
  receive_rate     numeric(12, 6) NOT NULL CHECK (receive_rate > 0),
  submitted_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_entries_org_date_idx ON public.rate_entries (organisation_id, date DESC);

ALTER TABLE public.rate_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_rate_entries" ON public.rate_entries
  FOR SELECT TO authenticated
  USING (organisation_id = public.current_org_id());

CREATE POLICY "org_insert_rate_entries" ON public.rate_entries
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = public.current_org_id());
