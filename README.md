# FTC Fantasy Worlds 2026

Fantasy-style FTC game for the 2026 World Championship season.

The app is a `Next.js` App Router project with:

- `Supabase Auth` email magic-link sign-in
- private invite-code leagues
- one active entry per user per league
- six provisional divisions for the 2026 Worlds format
- live FTC roster/scoring sync routes backed by the official FTC Events API

## Stack

- `Next.js 16`
- `React 19`
- `Supabase SSR`
- `Tailwind CSS 4`
- `Vitest`

## Environment

Copy `.env.example` into `.env.local` and provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FTC_API_USERNAME`
- `FTC_API_TOKEN`

`SUPABASE_SERVICE_ROLE_KEY` is required for persistent sync jobs. Without it, the UI can still fall back to a live FTC preview if the FTC credentials are present.

## Database Setup

Run the SQL migration in:

- `supabase/migrations/202603170001_initial_schema.sql`

The migration creates:

- `profiles`
- `seasons`
- `division_groups`
- `qualified_teams`
- `leagues`
- `league_members`
- `entries`
- `entry_teams`
- `score_ledgers`
- `sync_runs`

It also installs:

- profile auto-provisioning from `auth.users`
- row-level security for private league access
- a seeded `ftc-worlds-2026` season row

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Sync Routes

- `POST /api/sync/roster`
  - imports the Worlds-qualified roster
  - uses official division assignments when FIRST publishes them
  - otherwise generates provisional `Division A` through `Division F`
- `POST /api/sync/scoring`
  - pulls rankings and match results from official FTC events
  - calculates fantasy points
  - writes score ledgers for all saved entries

Add `?dryRun=true` to either endpoint to inspect the sync without writing to Supabase.

## Routes

- `/`
- `/sign-in`
- `/dashboard`
- `/leagues/[leagueCode]`
- `/entries/[entryId]`

## Tests

```bash
npm run test
```

The current test suite covers provisional division balancing, roster validation, scoring math, and leaderboard ordering.
