-- 019_kayd_console.sql
-- Internal console for Kayd team members.
--
--   1. kayd_staff          Kayd team accounts. Never members of a client organisation.
--   2. organisations        status (active / trial / suspended) + manual subscription fields.
--   3. staff_users          locked_at / locked_reason.
--   4. current_org_id()     returns NULL for a locked person or a suspended organisation,
--                           so every org-scoped RLS policy shuts them out at once.
--   5. my_account_state()   lets middleware tell a blocked user why.
--   6. activity_log         append-only history of every change to money and setup
--                           tables, plus sign-ins. Readable by the service role only.
--   7. kayd_access_log      append-only record of every console action. A client's
--                           admins can read the rows for their own organisation.
--   8. kayd_revoke_sessions() signs a person out of every device (service role only).
--   9. handle_new_user()    skips Kayd staff, so they never get an organisation.
--
-- Exceptions to the usual "every table has organisation_id + org RLS" rule:
-- kayd_staff is platform-level and has no organisation. activity_log and
-- kayd_access_log keep organisation_id WITHOUT a foreign key so history
-- outlives a deleted organisation, and the log cannot be cascade-deleted.

-- ------------------------------------------------------------
-- 1. Kayd staff
-- ------------------------------------------------------------
create table if not exists public.kayd_staff (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null,
  invited_by  uuid references public.kayd_staff (id) on delete set null,
  created_at  timestamptz not null default now(),
  removed_at  timestamptz
);

alter table public.kayd_staff enable row level security;
-- No policies: only the service role (server code) reads or writes it.

-- ------------------------------------------------------------
-- 2. Organisation status and subscription (entered by hand for now)
-- ------------------------------------------------------------
alter table public.organisations
  add column if not exists status text not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists suspended_by uuid references public.kayd_staff (id) on delete set null,
  add column if not exists plan text,
  add column if not exists price_gbp_monthly numeric(10, 2),
  add column if not exists renews_on date,
  add column if not exists trial_ends_on date;

alter table public.organisations drop constraint if exists organisations_status_check;
alter table public.organisations
  add constraint organisations_status_check
  check (status in ('active', 'trial', 'suspended'));

-- ------------------------------------------------------------
-- 3. Locking a person
-- ------------------------------------------------------------
alter table public.staff_users
  add column if not exists locked_at timestamptz,
  add column if not exists locked_reason text;

-- ------------------------------------------------------------
-- 4. current_org_id(): blocked people and suspended orgs see nothing
-- ------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.organisation_id
    from public.staff_users s
    join public.organisations o on o.id = s.organisation_id
   where s.id = auth.uid()
     and s.locked_at is null
     and o.status <> 'suspended';
$$;

grant execute on function public.current_org_id() to authenticated;

-- ------------------------------------------------------------
-- 5. my_account_state(): why a signed-in person is blocked, if they are
-- ------------------------------------------------------------
create or replace function public.my_account_state()
returns table (locked boolean, org_suspended boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.locked_at is not null,
         coalesce(o.status = 'suspended', false)
    from public.staff_users s
    left join public.organisations o on o.id = s.organisation_id
   where s.id = auth.uid();
$$;

grant execute on function public.my_account_state() to authenticated;

-- ------------------------------------------------------------
-- Append-only guard shared by both logs
-- ------------------------------------------------------------
create or replace function public.reject_log_change()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', TG_TABLE_NAME;
end;
$$;

-- ------------------------------------------------------------
-- 6. Activity log
-- ------------------------------------------------------------
create table if not exists public.activity_log (
  id               bigint generated always as identity primary key,
  organisation_id  uuid,
  actor_id         uuid,
  action           text not null,          -- insert | update | delete | sign_in
  entity_type      text not null,          -- table name, or 'auth'
  entity_id        text,
  old_data         jsonb,
  new_data         jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists activity_log_org_time_idx   on public.activity_log (organisation_id, created_at desc);
create index if not exists activity_log_actor_time_idx on public.activity_log (actor_id, created_at desc);

alter table public.activity_log enable row level security;
-- No policies: clients never read it directly; the console reads it server-side.

drop trigger if exists activity_log_no_update on public.activity_log;
create trigger activity_log_no_update
  before update or delete on public.activity_log
  for each row execute function public.reject_log_change();

drop trigger if exists activity_log_no_truncate on public.activity_log;
create trigger activity_log_no_truncate
  before truncate on public.activity_log
  for each statement execute function public.reject_log_change();

-- Generic change logger. Trigger arguments name columns to ignore when
-- deciding whether an UPDATE is worth logging (running balances, timestamps).
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_org uuid;
begin
  if TG_OP = 'INSERT' then
    v_new := to_jsonb(NEW);
  elsif TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
  else
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    if (v_old - TG_ARGV) = (v_new - TG_ARGV) then
      return NEW;
    end if;
  end if;

  v_org := nullif(coalesce(v_new ->> 'organisation_id', v_old ->> 'organisation_id'), '')::uuid;

  insert into public.activity_log
    (organisation_id, actor_id, action, entity_type, entity_id, old_data, new_data)
  values
    (v_org, auth.uid(), lower(TG_OP), TG_TABLE_NAME,
     coalesce(v_new ->> 'id', v_old ->> 'id'), v_old, v_new);

  return coalesce(NEW, OLD);
end;
$$;

do $$
declare
  spec text[];
  specs text[][] := array[
    array['agent_deposits',      ''],
    array['individual_deposits', ''],
    array['collection_pickups',  ''],
    array['cit_collections',     ''],
    array['daily_balances',      'updated_at'],
    array['daily_rates',         ''],
    array['rate_entries',        ''],
    array['agents',              'updated_at,balance_usd,last_agent_deposit'],
    array['regional_offices',    'cash_held_gbp,last_collection_date'],
    array['staff_users',         'last_active_at,has_seen_tour,onboarded_at']
  ];
  args text;
begin
  foreach spec slice 1 in array specs loop
    if to_regclass('public.' || spec[1]) is null then
      continue;
    end if;
    args := case
      when spec[2] = '' then ''
      else (select string_agg(quote_literal(x), ', ') from unnest(string_to_array(spec[2], ',')) x)
    end;
    execute format('drop trigger if exists log_activity on public.%I', spec[1]);
    execute format(
      'create trigger log_activity after insert or update or delete on public.%I
         for each row execute function public.log_activity(%s)',
      spec[1], args
    );
  end loop;
end$$;

-- Sign-ins: extend the existing last_sign_in_at mirror to also log the event.
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.last_sign_in_at is distinct from OLD.last_sign_in_at then
    update public.staff_users
       set last_active_at = NEW.last_sign_in_at
     where id = NEW.id;

    insert into public.activity_log (organisation_id, actor_id, action, entity_type, entity_id)
    values (
      (select organisation_id from public.staff_users where id = NEW.id),
      NEW.id, 'sign_in', 'auth', NEW.id::text
    );
  end if;
  return NEW;
end;
$$;

-- ------------------------------------------------------------
-- 7. Kayd access log
-- ------------------------------------------------------------
create table if not exists public.kayd_access_log (
  id               bigint generated always as identity primary key,
  organisation_id  uuid,                 -- null for console-only actions (e.g. adding Kayd staff)
  staff_id         uuid not null,
  staff_name       text not null,
  action           text not null,        -- viewed_amounts | exported | sent_reset | signed_out | locked | unlocked | suspended | reactivated | subscription_updated | staff_invited | staff_removed
  target_user_id   uuid,
  target_name      text,
  reason           text,
  expires_at       timestamptz,          -- for viewed_amounts: when amounts hide again
  created_at       timestamptz not null default now()
);

create index if not exists kayd_access_log_org_time_idx on public.kayd_access_log (organisation_id, created_at desc);
create index if not exists kayd_access_log_grant_idx    on public.kayd_access_log (staff_id, organisation_id, action, expires_at);

alter table public.kayd_access_log enable row level security;

drop policy if exists "org_admin_read_kayd_access_log" on public.kayd_access_log;
create policy "org_admin_read_kayd_access_log" on public.kayd_access_log
  for select to authenticated
  using (
    organisation_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'superadmin')
  );

drop trigger if exists kayd_access_log_no_update on public.kayd_access_log;
create trigger kayd_access_log_no_update
  before update or delete on public.kayd_access_log
  for each row execute function public.reject_log_change();

drop trigger if exists kayd_access_log_no_truncate on public.kayd_access_log;
create trigger kayd_access_log_no_truncate
  before truncate on public.kayd_access_log
  for each statement execute function public.reject_log_change();

-- ------------------------------------------------------------
-- 8. Sign a person out of every device
-- ------------------------------------------------------------
create or replace function public.kayd_revoke_sessions(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.refresh_tokens where user_id = target::text;
  delete from auth.sessions where user_id = target;
end;
$$;

revoke all on function public.kayd_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.kayd_revoke_sessions(uuid) to service_role;

-- ------------------------------------------------------------
-- 9. New auth users: Kayd staff never get an organisation
-- ------------------------------------------------------------
-- app_metadata can only be set with the service role, so a public signup
-- cannot claim to be Kayd staff.
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
  if coalesce(NEW.raw_app_meta_data ->> 'kayd_staff', '') = 'true' then
    return NEW;
  end if;

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
    insert into public.organisations (name)
    values (coalesce(meta_name, split_part(NEW.email, '@', 1)) || '''s organisation')
    returning id into resolved_org;
    resolved_role := 'admin';
  end if;

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
