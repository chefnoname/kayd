# Kayd

Kayd is a hawala / remittance business management tool for head-office staff.
It replaces manual tracking with accurate cash flow management,
agent settlement, and discrepancy detection.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **shadcn/ui** for primitives, **CSS Modules** for layout & custom styling
- **Supabase** (PostgreSQL + Auth) via `@supabase/supabase-js` v2 and `@supabase/ssr`

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

You can find both values in your Supabase project under
**Project Settings → API**.

### 3. Run the database migration

In the Supabase SQL editor (or via `supabase db push` if you use the CLI),
run the SQL in:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables and enables Row Level Security
(authenticated users can read/write all tables).

### 4. Create a staff user

In Supabase **Authentication → Users**, invite or create an
email/password user. Then in the SQL editor add a corresponding
`staff_users` row:

```sql
insert into public.staff_users (id, email, name, role)
values ('<auth-user-uuid>', '<email>', '<display name>', 'admin');
```

### 5. Run the app

```bash
npm run dev
```

Visit <http://localhost:3000>. You will be redirected to `/login`.
After signing in, if today's GBP→USD rate is not set you will be
redirected to `/setup` to set it, then on to `/dashboard`.

## Project structure

```
app/
  (auth)/login/             ← Email/password sign-in
  (dashboard)/              ← Authenticated app shell
    dashboard/
    agents/
    settlement/
    deposits/
    locations/
    end-of-day/
    setup/
components/
  ui/                       ← shadcn/ui primitives
  layout/                   ← AppHeader, Sidebar
  shared/                   ← PageHeader and other reusables
lib/
  supabase.ts               ← Supabase client
  utils.ts                  ← cn(), currency helpers, date helpers
styles/                     ← Global CSS + theme variables
supabase/migrations/        ← SQL migrations
```

## Colour scheme

| Token              | Hex       |
| ------------------ | --------- |
| Sand Tan           | `#e1b382` |
| Sand Tan Shadow    | `#c89666` |
| Night Blue         | `#2d545e` |
| Night Blue Shadow  | `#12343b` |

Available as CSS variables (`--kayd-sand`, `--kayd-sand-shadow`,
`--kayd-night`, `--kayd-night-shadow`) and as Tailwind utilities
(`bg-kayd-night`, `text-kayd-sand`, etc.).

## Auth flow

Handled in `middleware.ts`:

1. Unauthenticated request → redirect to `/login`.
2. Authenticated but no `daily_rates` row for today → redirect to `/setup`.
3. Otherwise → allow.

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start Next.js dev server |
| `npm run build` | Production build         |
| `npm run start` | Run production server    |
| `npm run lint`  | Lint with ESLint         |

