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
- `SYNC_ROUTE_SECRET`

`SUPABASE_SERVICE_ROLE_KEY` is required for persistent sync jobs. `SYNC_ROUTE_SECRET` is required to call the protected sync endpoints. Without the service-role key, the UI can still fall back to a live FTC preview if the FTC credentials are present.

## Database Setup

Run the SQL migration in:

- `supabase/migrations/202603170001_initial_schema.sql`
- `supabase/migrations/202603280001_pre_division_hardening.sql`

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
- invite preview and join RPCs for private leagues
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

Both endpoints require:

```text
Authorization: Bearer <SYNC_ROUTE_SECRET>
```

Add `?dryRun=true` to either endpoint to inspect the sync without writing to Supabase.

Example:

```bash
curl -X POST http://localhost:3000/api/sync/roster \
  -H "Authorization: Bearer $SYNC_ROUTE_SECRET"
```

```bash
curl -X POST "http://localhost:3000/api/sync/scoring?dryRun=true" \
  -H "Authorization: Bearer $SYNC_ROUTE_SECRET"
```

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

## Local Smoke Test

1. Run both Supabase SQL migrations.
2. Start the app with `npm run dev`.
3. Sign in at `/sign-in` with a magic link.
4. Create a league on `/dashboard`.
5. Open the invite code in a second signed-in account and join the league.
6. Create an entry and save a 12-team roster with one champion pick.
7. Run the protected roster sync.
8. Run the scoring sync in dry-run mode and confirm the current pre-division response is a successful no-op with a waiting message.
