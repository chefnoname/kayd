-- ============================================================
-- 006: Pending invites
--
-- Admin invites are now created app-side BEFORE the auth user
-- exists. That requires:
--
--   • staff_users.id can be NULL (filled by the trigger on first
--     login)
--   • A surrogate primary key (row_id) so a pending row has a
--     stable identity
--   • A 'pending' status value
--   • A unique (organisation_id, lower(email)) index so the
--     handle_new_user trigger can find the pre-created row and
--     UPDATE it instead of inserting a duplicate
-- ============================================================

-- 1. Make id nullable; swap PK to a surrogate row_id
alter table public.staff_users
  drop constraint if exists staff_users_pkey;

alter table public.staff_users
  alter column id drop not null;

alter table public.staff_users
  add column if not exists row_id uuid not null default gen_random_uuid();

alter table public.staff_users
  add constraint staff_users_pkey primary key (row_id);

-- FKs from other tables reference staff_users(id) — keep that column unique.
-- (Postgres UNIQUE allows multiple NULLs, so pending rows coexist.)
alter table public.staff_users
  drop constraint if exists staff_users_id_unique;
alter table public.staff_users
  add constraint staff_users_id_unique unique (id);

-- 2. Allow 'pending' status
alter table public.staff_users
  drop constraint if exists staff_users_status_check;
alter table public.staff_users
  add constraint staff_users_status_check
  check (status in ('active', 'inactive', 'pending'));

-- 3. One staff row per email per organisation (case-insensitive).
-- This is what handle_new_user uses to merge the pre-created pending
-- row with the freshly created auth user.
create unique index if not exists staff_users_org_email_unique
  on public.staff_users (organisation_id, lower(email));

-- ------------------------------------------------------------
-- 4. handle_new_user
--
-- On auth.users INSERT:
--   • Resolve the organisation_id (from metadata, inviter, or by
--     creating a brand new org for public signups).
--   • If a row already exists for (org, email) — created by the
--     admin invite flow — UPDATE it: fill in id, keep status =
--     'pending' so the sign-in trigger can flip it to 'active'.
--   • Otherwise INSERT. Invited users land as 'pending',
--     public signups as 'active'.
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
  resolved_org    uuid;
  resolved_role   text;
  existing_row    uuid;
  is_invite       boolean;
begin
  meta_invited_by := nullif(NEW.raw_user_meta_data->>'invited_by', '')::uuid;
  meta_org_id     := nullif(NEW.raw_user_meta_data->>'organisation_id', '')::uuid;
  meta_role       := NEW.raw_user_meta_data->>'role';
  meta_name       := NEW.raw_user_meta_data->>'name';

  is_invite := meta_invited_by is not null or meta_org_id is not null;

  -- Resolve organisation
  if meta_org_id is not null then
    resolved_org := meta_org_id;
  elsif meta_invited_by is not null then
    select organisation_id into resolved_org
      from public.staff_users where id = meta_invited_by;
  else
    insert into public.organisations (name)
    values (coalesce(meta_name, split_part(NEW.email, '@', 1)) || '''s organisation')
    returning id into resolved_org;
  end if;

  -- Admins can never escalate via invite metadata
  if is_invite then
    resolved_role := 'staff';
  else
    resolved_role := 'admin';
  end if;

  -- Merge with the pre-created pending row, if present.
  select row_id into existing_row
    from public.staff_users
   where organisation_id = resolved_org
     and lower(email) = lower(NEW.email)
   limit 1;

  if existing_row is not null then
    update public.staff_users
       set id    = NEW.id,
           name  = coalesce(meta_name, name)
     where row_id = existing_row;
  else
    insert into public.staff_users (
      id, email, name, role, invited_by, status, organisation_id
    )
    values (
      NEW.id,
      NEW.email,
      coalesce(meta_name, split_part(NEW.email, '@', 1)),
      resolved_role,
      meta_invited_by,
      case when is_invite then 'pending' else 'active' end,
      resolved_org
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 5. handle_user_sign_in — flip pending → active on first login.
-- ------------------------------------------------------------
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.last_sign_in_at is distinct from OLD.last_sign_in_at then
    update public.staff_users
       set last_active_at = NEW.last_sign_in_at,
           status         = case
                              when status = 'pending' then 'active'
                              else status
                            end
     where id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_sign_in on auth.users;
create trigger on_auth_user_sign_in
  after update of last_sign_in_at on auth.users
  for each row execute function public.handle_user_sign_in();
