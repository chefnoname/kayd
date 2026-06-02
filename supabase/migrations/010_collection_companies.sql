-- 010_collection_companies.sql

create table public.collection_companies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index collection_companies_org_idx on public.collection_companies (organisation_id);
create unique index collection_companies_org_name_key on public.collection_companies (organisation_id, name);

alter table public.collection_companies enable row level security;

create policy "org_read_collection_companies" on public.collection_companies
  for select to authenticated
  using (organisation_id = public.current_org_id());

create policy "org_insert_collection_companies" on public.collection_companies
  for insert to authenticated
  with check (organisation_id = public.current_org_id());

create policy "org_delete_collection_companies" on public.collection_companies
  for delete to authenticated
  using (organisation_id = public.current_org_id());

-- Add FK column to collection_pickups (nullable — old records stay null)
alter table public.collection_pickups
  add column if not exists collection_company_id uuid references public.collection_companies(id) on delete set null;

-- Add FK column to agents (nullable — existing agents stay null)
alter table public.agents
  add column if not exists collection_company_id uuid references public.collection_companies(id) on delete set null;
