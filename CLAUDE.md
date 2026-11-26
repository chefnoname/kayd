# Kayd — Claude Code Context

## What is Kayd?
Multi-tenant hawala/remittance SaaS for head-office staff.
Deployed at `kayd.live` on Vercel.

## Tech Stack
- **Framework:** Next.js 14, App Router, TypeScript (strict)
- **Auth + DB:** Supabase (Auth with PKCE flow + PostgreSQL)
- **UI:** shadcn/ui primitives + CSS Modules — **no Tailwind utility classes in components**
- **Deployment:** Vercel

## Env Vars (critical)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — this is the anon key, renamed
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to browser

## Project Structure
```
app/
  (auth)/          — login, signup, set-password, verify-email
  (dashboard)/     — all authenticated pages (layout with sidebar)
  api/admin/       — server API routes (invite, deactivate, change-role, reset-password, users)
  api/console/     — Kayd Console actions (one POST route), /me, activity CSV export
  console/         — Kayd Console: internal pages for Kayd staff only (see below)
  auth/callback/   — Supabase auth callback
components/
  ui/              — shadcn primitives (button, card, dialog, input, table, etc.)
  admin/           — team management components
  agents/          — agent CRUD
  agent-deposits/  — settlement/deposit forms
  dashboard/       — dashboard cards and widgets
  deposits/        — individual deposit management
  eod/             — end-of-day reconciliation
  layout/          — AppHeader, Sidebar
  locations/       — regional office management
  setup/           — daily rate input
  shared/          — cross-cutting (PageHeader, AccessDeniedToast, AuthBoundary)
  console/         — Kayd Console client components
lib/
  supabase.ts      — browser client (PKCE, cookie storage adapter)
  supabase-admin.ts — service role client (server-only)
  org.ts           — org helper
  console/         — console server helpers (staff check, access log), queries, activity text
  session-reset.ts — resetToPath(): hard reload that drops all cached client state
  utils.ts         — generic utils
middleware.ts      — auth guard, role gating, daily-rate redirect
scripts/add-kayd-staff.mjs — creates the first Kayd staff account (npm run console:add-staff)
supabase/migrations/ — numbered SQL migrations (001–019)
styles/theme.css   — CSS custom properties for theming
```

## Database & Multi-Tenancy

### Key tables
`organisations`, `staff_users`, `daily_rates`, `agents`, `settlements`,
`individual_deposits`, `collection_pickups`, `regional_offices`, `daily_balances`

### RLS rules (CRITICAL — read before writing ANY SQL)
- Every data table has `organisation_id` column
- All RLS policies use `public.current_org_id()` — a `SECURITY DEFINER` function
  that reads `staff_users.organisation_id` for `auth.uid()`
- **NEVER** do direct `staff_users` lookups inside RLS policies — causes infinite recursion
- The function is named `current_org_id()` in code (was `get_my_org_id()` originally)

### Signup flow
1. Public signup → trigger `handle_new_user()` auto-creates an org, sets role = `admin`
2. Admin invite → service role creates auth user with `organisation_id` + `invited_by` in metadata → trigger copies org, forces role = `staff`

### Roles
- `admin` — full access, can invite staff, manage team
- `staff` — operational access, no team management
- `superadmin` — legacy, grants access to `/admin` root

## Kayd Console (internal admin)
- For Kayd staff only. Kayd staff are NOT client staff: they have `app_metadata.kayd_staff = true`
  (only the service role can set it), a row in `kayd_staff`, and no organisation.
  `handle_new_user()` skips them. Staff are checked server-side on every page and API call.
- `CONSOLE_HOST` (e.g. `console.kayd.live`): when set, `/console` only answers on that host and
  is 404 everywhere else. Unset locally, so use `localhost:3000/console`.
- Money amounts are hidden by default. "Show amounts" needs a written reason, lasts 15 minutes,
  and is a `kayd_access_log` row with `expires_at`.
- Locking a person or suspending an org makes `current_org_id()` return NULL for them, so RLS
  hides everything; middleware signs them out via `my_account_state()`.
- `activity_log` and `kayd_access_log` are append-only (triggers reject update/delete/truncate).
  `activity_log` is filled by the `log_activity()` trigger on money and setup tables.
  Client admins can read their org's `kayd_access_log` rows (shown on /admin/team).
- Exceptions to the organisation_id rule: `kayd_staff` has none (platform-level), and the two log
  tables keep `organisation_id` without a foreign key so history outlives a deleted org.

## Conventions

### Code style
- CSS Modules for all styling (`.module.css` files colocated with components)
- shadcn/ui components in `components/ui/` — do not modify these
- Feature components grouped by domain in `components/{domain}/`
- Each feature domain has its own `types.ts`

### Supabase client usage
- Browser/client components: `createClient()` from `lib/supabase.ts`
- Server API routes needing elevated access: `createAdminClient()` from `lib/supabase-admin.ts`
- Middleware: inline `createServerClient` from `@supabase/ssr`

### Migrations
- Numbered sequentially: `001_`, `002_`, etc.
- Run in Supabase SQL editor before deploying
- Always add `organisation_id` to new tables
- Always add org-scoped RLS policies using `current_org_id()`

## Anti-Patterns — DO NOT
- Use Tailwind utility classes in components (CSS Modules only)
- Reference `staff_users` directly in RLS policies
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` — it's `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Skip `organisation_id` on new tables
- Modify `components/ui/*` shadcn primitives
- Create tables without RLS enabled
