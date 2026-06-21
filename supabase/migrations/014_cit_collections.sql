-- 014_cit_collections.sql
-- Cash-in-transit collections made by HQ or sub-branches via CIT companies (e.g. G4S).
-- HQ sale rate is stored per row — completely separate from rate_entries (agent rates).
-- Company and branch names are denormalized so historical records survive deletions.

CREATE TABLE public.cit_collections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  date              date NOT NULL,
  company_id        uuid REFERENCES public.collection_companies(id) ON DELETE SET NULL,
  company_name      text NOT NULL,
  hq_sale_rate      numeric(12, 6) NOT NULL CHECK (hq_sale_rate > 0),
  amount_usd        numeric(14, 2) NOT NULL CHECK (amount_usd > 0),
  branch_office_id  uuid REFERENCES public.regional_offices(id) ON DELETE SET NULL,
  branch_name       text NOT NULL,
  brought_to_hq     boolean NOT NULL DEFAULT false,
  courier_notes     text,
  logged_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cit_collections_org_date_idx ON public.cit_collections (organisation_id, date DESC);

ALTER TABLE public.cit_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_cit_collections" ON public.cit_collections
  FOR SELECT TO authenticated
  USING (organisation_id = public.current_org_id());

CREATE POLICY "org_insert_cit_collections" ON public.cit_collections
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = public.current_org_id());
