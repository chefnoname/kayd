-- ============================================================
-- 005: Multi-tenant by organisation
--
-- • New `organisations` table
-- • `organisation_id` on every data table + composite unique
--   constraints where date / name uniqueness was previously global
-- • Public signup auto-creates an org; admin invites copy
--   the inviter's organisation_id (and force role = 'staff')
-- • RLS scoped by the caller's organisation_id
-- ============================================================

-- ------------------------------------------------------------
-- 1. organisations table
-- ------------------------------------------------------------
create table if not exists public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

alter table public.organisations enable row level security;

-- Anyone authenticated can read their own org, only the trigger
-- (security definer) inserts new orgs.
drop policy if exists "organisations_read_own"  on public.organisations;
drop policy if exists "organisations_write_own" on public.organisations;

create policy "organisations_read_own" on public.organisations
  for select
  to authenticated
  using (
    id = (
      select organisation_id from public.staff_users
       where id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. organisation_id column on every domain table
-- ------------------------------------------------------------
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
      'alter table public.%1$I
         add column if not exists organisation_id uuid
         references public.organisations(id) on delete cascade;',
      t
    );
    execute format(
      'create index if not exists %1$s_org_idx on public.%1$I (organisation_id);',
      t
    );
  end loop;
end$$;

-- ------------------------------------------------------------
-- 3. Composite uniqueness — previously global
-- ------------------------------------------------------------
alter table public.daily_rates    drop constraint if exists daily_rates_date_key;
alter table public.daily_balances drop constraint if exists daily_balances_date_key;
alter table public.regional_offices drop constraint if exists regional_offices_name_key;

create unique index if not exists daily_rates_org_date_key
  on public.daily_rates (organisation_id, date);
create unique index if not exists daily_balances_org_date_key
  on public.daily_balances (organisation_id, date);
create unique index if not exists regional_offices_org_name_key
  on public.regional_offices (organisation_id, name);

-- ------------------------------------------------------------
-- 4. Helper used by RLS (avoids recursive lookups on staff_users)
-- ------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id from public.staff_users where id = auth.uid();
$$;

grant execute on function public.current_org_id() to authenticated;

-- ------------------------------------------------------------
-- 5. Updated signup trigger
--
--    • meta.organisation_id present → use it (admin invite)
--    • meta.invited_by present → derive from inviter
--    • else (public signup) → create a new org and use it
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_invited_by uuid;
  meta_org_id     uuid;
  meta_role       text;
  meta_name       text;
  resolved_role   text;
  resolved_org    uuid;
begin
  meta_invited_by := nullif(NEW.raw_user_meta_data->>'invited_by', '')::uuid;
  meta_org_id     := nullif(NEW.raw_user_meta_data->>'organisation_id', '')::uuid;
  meta_role       := NEW.raw_user_meta_data->>'role';
  meta_name       := NEW.raw_user_meta_data->>'name';

  if meta_org_id is not null then
    resolved_org  := meta_org_id;
    resolved_role := coalesce(meta_role, 'staff');
  elsif meta_invited_by is not null then
    select organisation_id into resolved_org
      from public.staff_users
     where id = meta_invited_by;
    resolved_role := coalesce(meta_role, 'staff');
  else
    -- Public signup → brand new organisation owned by this user
    insert into public.organisations (name)
    values (coalesce(meta_name, split_part(NEW.email, '@', 1)) || '''s organisation')
    returning id into resolved_org;
    resolved_role := 'admin';
  end if;

  -- Admins cannot create other admins via invite
  if meta_invited_by is not null and resolved_role not in ('staff') then
    resolved_role := 'staff';
  end if;

  insert into public.staff_users (
    id, email, name, role, invited_by, status, organisation_id
  )
  values (
    NEW.id,
    NEW.email,
    coalesce(meta_name, split_part(NEW.email, '@', 1)),
    resolved_role,
    meta_invited_by,
    'active',
    resolved_org
  )
  on conflict (id) do update set
    email           = excluded.email,
    name            = coalesce(excluded.name, public.staff_users.name),
    organisation_id = coalesce(public.staff_users.organisation_id, excluded.organisation_id);

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6. Replace blanket-authenticated RLS with org-scoped RLS
-- ------------------------------------------------------------
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
    execute format(
      'drop policy if exists "org_read_%1$s"  on public.%1$I;', t
    );
    execute format(
      'drop policy if exists "org_write_%1$s" on public.%1$I;', t
    );

    execute format($p$
      create policy "org_read_%1$s" on public.%1$I
        for select
        to authenticated
        using (organisation_id = public.current_org_id());
    $p$, t);

    execute format($p$
      create policy "org_write_%1$s" on public.%1$I
        for all
        to authenticated
        using (organisation_id = public.current_org_id())
        with check (organisation_id = public.current_org_id());
    $p$, t);
  end loop;
end$$;
