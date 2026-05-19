-- ============================================================
-- Kayd — initial schema
-- Hawala/remittance management for head-office staff
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Staff users
-- Mirrors auth.users (one row per app user) with role + display info.
-- ------------------------------------------------------------
create table if not exists public.staff_users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        text not null default 'staff' check (role in ('admin', 'staff')),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Daily rates (one rate per business day)
-- ------------------------------------------------------------
create table if not exists public.daily_rates (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  gbp_to_usd  numeric(12, 6) not null check (gbp_to_usd > 0),
  set_by      uuid references public.staff_users (id) on delete set null,
  set_at      timestamptz not null default now()
);

create index if not exists daily_rates_date_idx on public.daily_rates (date desc);

-- ------------------------------------------------------------
-- Agents
-- ------------------------------------------------------------
create table if not exists public.agents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  city            text not null,
  phone           text,
  balance_usd     numeric(14, 2) not null default 0,
  last_settlement date,
  status          text not null default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists agents_status_idx on public.agents (status);
create index if not exists agents_name_idx   on public.agents (name);

-- ------------------------------------------------------------
-- Settlements (cash received from agents)
-- ------------------------------------------------------------
create table if not exists public.settlements (
  id                      uuid primary key default gen_random_uuid(),
  agent_id                uuid not null references public.agents (id) on delete restrict,
  date                    date not null,
  amount_received_gbp     numeric(14, 2) not null check (amount_received_gbp >= 0),
  rate_used               numeric(12, 6) not null check (rate_used > 0),
  amount_usd_equivalent   numeric(14, 2) not null,
  new_agent_balance_usd   numeric(14, 2) not null,
  receipt_number          text,
  recorded_by             uuid references public.staff_users (id) on delete set null,
  notes                   text,
  created_at              timestamptz not null default now()
);

create index if not exists settlements_agent_idx on public.settlements (agent_id, date desc);
create index if not exists settlements_date_idx  on public.settlements (date desc);

-- ------------------------------------------------------------
-- Daily balances (end-of-day snapshot)
-- ------------------------------------------------------------
create table if not exists public.daily_balances (
  id                      uuid primary key default gen_random_uuid(),
  date                    date not null unique,
  opening_gbp             numeric(14, 2) not null default 0,
  system_limit_usd        numeric(14, 2) not null default 0,
  cash_in_safe_gbp        numeric(14, 2) not null default 0,
  total_agent_debt_gbp    numeric(14, 2) not null default 0,
  collections_today_gbp   numeric(14, 2) not null default 0,
  closing_gbp             numeric(14, 2) not null default 0,
  is_closed               boolean not null default false,
  discrepancy             numeric(14, 2) not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Individual deposits (held customer money)
-- ------------------------------------------------------------
create table if not exists public.individual_deposits (
  id              uuid primary key default gen_random_uuid(),
  holder_name     text not null,
  amount_usd      numeric(14, 2) not null check (amount_usd >= 0),
  date_received   date not null,
  location        text,
  notes           text,
  status          text not null default 'held' check (status in ('held', 'released')),
  released_at     timestamptz,
  released_to     text,
  created_at      timestamptz not null default now()
);

create index if not exists individual_deposits_status_idx on public.individual_deposits (status);

-- ------------------------------------------------------------
-- Regional offices
-- ------------------------------------------------------------
create table if not exists public.regional_offices (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null unique,
  cash_held_gbp           numeric(14, 2) not null default 0,
  last_collection_date    date,
  created_at              timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Collection pickups (cash collected from regional offices)
-- ------------------------------------------------------------
create table if not exists public.collection_pickups (
  id            uuid primary key default gen_random_uuid(),
  office_id     uuid not null references public.regional_offices (id) on delete restrict,
  amount_gbp    numeric(14, 2) not null check (amount_gbp >= 0),
  date          date not null,
  collected_by  uuid references public.staff_users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists collection_pickups_office_idx on public.collection_pickups (office_id, date desc);

-- ============================================================
-- Row Level Security
-- Only authenticated users can read/write all tables.
-- ============================================================

alter table public.staff_users          enable row level security;
alter table public.daily_rates          enable row level security;
alter table public.agents               enable row level security;
alter table public.settlements          enable row level security;
alter table public.daily_balances       enable row level security;
alter table public.individual_deposits  enable row level security;
alter table public.regional_offices     enable row level security;
alter table public.collection_pickups   enable row level security;

-- Helper: create a single "authenticated full access" policy per table.
do $$
declare
  t text;
  tables text[] := array[
    'staff_users',
    'daily_rates',
    'agents',
    'settlements',
    'daily_balances',
    'individual_deposits',
    'regional_offices',
    'collection_pickups'
  ];
begin
  foreach t in array tables loop
    execute format(
      'drop policy if exists "authenticated_read_%1$s"  on public.%1$I;', t
    );
    execute format(
      'drop policy if exists "authenticated_write_%1$s" on public.%1$I;', t
    );

    execute format($p$
      create policy "authenticated_read_%1$s" on public.%1$I
        for select
        to authenticated
        using (true);
    $p$, t);

    execute format($p$
      create policy "authenticated_write_%1$s" on public.%1$I
        for all
        to authenticated
        using (true)
        with check (true);
    $p$, t);
  end loop;
end$$;
