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

```bash
cp .env.local.example .env.local
```

| Variable | Required | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase → Project Settings → API keys (publishable / anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | For team admin + rate jobs | Supabase → Project Settings → API keys (secret / service_role). Server-only. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | `http://localhost:3000` locally, `https://kayd.live` in production. Used in email links. |
| `RATES_API_SECRET` | For the daily rate job | Any random string (`openssl rand -hex 32`). Must match the GitHub Actions secret. |
| `EXCHANGE_RATE_API_KEY` | For automatic rates | https://www.exchangerate-api.com |
| `OPEN_EXCHANGE_RATES_KEY` | Optional fallback | https://openexchangerates.org |
| `CALENDLY_URL` | Optional | Booking link on the landing page |

Without the service role key the app still runs, but inviting staff,
resetting passwords, the admin user list and the rate fetch endpoint fail.

### 3. Set up the database

Run **every** file in `supabase/migrations/` in filename order
(`001` → `018`; the two `004_` files can run in either order), either in the
Supabase SQL editor or with `supabase db push` if you use the CLI.

Optionally run `supabase/seed_demo_data.sql` to load demo data
(edit the email at the top to match your account first).

In Supabase → **Authentication → URL Configuration**, set the Site URL to your
app URL and add `<app-url>/auth/callback` to the redirect allow list, so
signup confirmation, invite and password-reset links work.

### 4. Create your first user

Go to `/signup` in the app. The `handle_new_user()` trigger creates a new
organisation and makes you its `admin`; no manual SQL needed. Invite the rest
of your team from **Admin → Team**.

### 5. Run the app

```bash
npm run dev
```

Visit <http://localhost:3000>. `/` shows the landing page; the app lives behind
`/login`. If today's GBP→USD rate is not set you will be prompted to set it.

### 6. Daily exchange rate job (optional)

`.github/workflows/fetch-rates.yml` calls `POST /api/rates/fetch` at 07:00 UTC
on weekdays. Add two repository secrets in GitHub: `APP_URL` (e.g.
`https://kayd.live`) and `RATES_API_SECRET` (same value as in the app env).

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
| `npm test`      | Run unit tests (Vitest)  |

