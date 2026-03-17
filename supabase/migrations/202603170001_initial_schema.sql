create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  favorite_team_number integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seasons (
  id text primary key,
  label text not null,
  api_season integer not null,
  event_code text not null,
  division_count integer not null,
  teams_per_division integer not null,
  division_status text not null default 'provisional' check (division_status in ('official', 'provisional')),
  lock_mode text not null,
  scoring_preset text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.division_groups (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons (id) on delete cascade,
  code text not null,
  name text not null,
  display_order integer not null default 0,
  status text not null check (status in ('official', 'provisional')),
  official_event_code text,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (season_id, code)
);

create table if not exists public.qualified_teams (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons (id) on delete cascade,
  team_number integer not null,
  display_team_number text,
  division_group_id uuid references public.division_groups (id) on delete set null,
  division_code text not null,
  division_name text not null,
  official_event_code text,
  name_full text,
  name_short text,
  school_name text,
  robot_name text,
  city text,
  state_prov text,
  country text,
  home_region text,
  website text,
  sync_source text not null default 'api',
  sort_seed integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (season_id, team_number)
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons (id) on delete cascade,
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  is_private boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'owner')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (league_id, user_id)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  champion_pick_team_number integer,
  is_valid boolean not null default true,
  invalid_reason text,
  saved_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (league_id, user_id)
);

create table if not exists public.entry_teams (
  entry_id uuid not null references public.entries (id) on delete cascade,
  team_number integer not null,
  division_group_id uuid references public.division_groups (id) on delete set null,
  slot_number integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (entry_id, team_number)
);

create table if not exists public.score_ledgers (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  entry_id uuid not null references public.entries (id) on delete cascade,
  team_number integer not null,
  source_key text not null,
  source_type text not null,
  points integer not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (entry_id, source_key, team_number)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons (id) on delete cascade,
  sync_type text not null check (sync_type in ('roster', 'scoring')),
  status text not null check (status in ('error', 'running', 'success')),
  item_count integer not null default 0,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_league_members_user on public.league_members (user_id);
create index if not exists idx_entries_user on public.entries (user_id);
create index if not exists idx_score_ledgers_league on public.score_ledgers (league_id);
create index if not exists idx_qualified_teams_season on public.qualified_teams (season_id, division_code, team_number);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_seasons_updated_at
before update on public.seasons
for each row
execute function public.set_updated_at();

create trigger set_division_groups_updated_at
before update on public.division_groups
for each row
execute function public.set_updated_at();

create trigger set_qualified_teams_updated_at
before update on public.qualified_teams
for each row
execute function public.set_updated_at();

create trigger set_leagues_updated_at
before update on public.leagues
for each row
execute function public.set_updated_at();

create trigger set_entries_updated_at
before update on public.entries
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_league_member(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members
    where league_id = target_league_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_entry_owner(target_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entries
    where id = target_entry_id
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.division_groups enable row level security;
alter table public.qualified_teams enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.entries enable row level security;
alter table public.entry_teams enable row level security;
alter table public.score_ledgers enable row level security;
alter table public.sync_runs enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "seasons_select_public"
on public.seasons
for select
using (true);

create policy "division_groups_select_public"
on public.division_groups
for select
using (true);

create policy "qualified_teams_select_public"
on public.qualified_teams
for select
using (true);

create policy "sync_runs_select_public"
on public.sync_runs
for select
using (true);

create policy "leagues_select_members"
on public.leagues
for select
to authenticated
using (public.is_league_member(id));

create policy "leagues_insert_owner"
on public.leagues
for insert
to authenticated
with check (auth.uid() = created_by);

create policy "leagues_update_owner"
on public.leagues
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "league_members_select_members"
on public.league_members
for select
to authenticated
using (public.is_league_member(league_id));

create policy "league_members_insert_self"
on public.league_members
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "league_members_update_owner"
on public.league_members
for update
to authenticated
using (
  exists (
    select 1
    from public.leagues
    where leagues.id = league_members.league_id
      and leagues.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.leagues
    where leagues.id = league_members.league_id
      and leagues.created_by = auth.uid()
  )
);

create policy "entries_select_league_members"
on public.entries
for select
to authenticated
using (public.is_league_member(league_id));

create policy "entries_insert_owner"
on public.entries
for insert
to authenticated
with check (auth.uid() = user_id and public.is_league_member(league_id));

create policy "entries_update_owner"
on public.entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "entry_teams_select_league_members"
on public.entry_teams
for select
to authenticated
using (
  exists (
    select 1
    from public.entries
    where entries.id = entry_teams.entry_id
      and public.is_league_member(entries.league_id)
  )
);

create policy "entry_teams_insert_owner"
on public.entry_teams
for insert
to authenticated
with check (public.is_entry_owner(entry_id));

create policy "entry_teams_update_owner"
on public.entry_teams
for update
to authenticated
using (public.is_entry_owner(entry_id))
with check (public.is_entry_owner(entry_id));

create policy "entry_teams_delete_owner"
on public.entry_teams
for delete
to authenticated
using (public.is_entry_owner(entry_id));

create policy "score_ledgers_select_league_members"
on public.score_ledgers
for select
to authenticated
using (public.is_league_member(league_id));

insert into public.seasons (
  id,
  label,
  api_season,
  event_code,
  division_count,
  teams_per_division,
  division_status,
  lock_mode,
  scoring_preset,
  config
)
values (
  'ftc-worlds-2026',
  'FTC Fantasy Worlds 2026',
  2025,
  'FTCCMP1',
  6,
  2,
  'provisional',
  'post-official-divisions-until-first-worlds-qual-match',
  'simple-balanced-match-only',
  jsonb_build_object(
    'rosterPickCount', 12,
    'divisionCount', 6,
    'teamsPerDivision', 2,
    'eventCode', 'FTCCMP1'
  )
)
on conflict (id) do update
set
  label = excluded.label,
  api_season = excluded.api_season,
  event_code = excluded.event_code,
  division_count = excluded.division_count,
  teams_per_division = excluded.teams_per_division,
  division_status = excluded.division_status,
  lock_mode = excluded.lock_mode,
  scoring_preset = excluded.scoring_preset,
  config = excluded.config,
  updated_at = timezone('utc', now());
