alter table public.seasons
  add column if not exists official_divisions_published_at timestamptz,
  add column if not exists entries_locked_at timestamptz;

create or replace function public.shares_league_with_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members current_membership
    join public.league_members target_membership
      on target_membership.league_id = current_membership.league_id
    where current_membership.user_id = auth.uid()
      and target_membership.user_id = target_user_id
  );
$$;

create or replace function public.get_league_preview_by_invite(target_invite_code text)
returns table (
  league_id uuid,
  name text,
  invite_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select leagues.id, leagues.name, leagues.invite_code
  from public.leagues
  where leagues.invite_code = upper(trim(target_invite_code))
  limit 1;
$$;

create or replace function public.join_league_with_invite(target_invite_code text)
returns table (
  league_id uuid,
  name text,
  invite_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_league public.leagues%rowtype;
  selected_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required to join a league.';
  end if;

  select *
  into selected_league
  from public.leagues
  where invite_code = upper(trim(target_invite_code))
  limit 1;

  if selected_league.id is null then
    raise exception 'Invite code not found.';
  end if;

  selected_role := case
    when selected_league.created_by = auth.uid() then 'owner'
    else 'member'
  end;

  insert into public.league_members (league_id, user_id, role, joined_at)
  values (
    selected_league.id,
    auth.uid(),
    selected_role,
    timezone('utc', now())
  )
  on conflict (league_id, user_id) do update
  set
    joined_at = excluded.joined_at,
    role = case
      when public.league_members.role = 'owner' then 'owner'
      else excluded.role
    end;

  return query
  select selected_league.id, selected_league.name, selected_league.invite_code;
end;
$$;

drop policy if exists "league_members_insert_self" on public.league_members;
drop policy if exists "league_members_insert_owner" on public.league_members;
drop policy if exists "profiles_select_shared_league" on public.profiles;

create policy "league_members_insert_owner"
on public.league_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.leagues
    where leagues.id = league_members.league_id
      and leagues.created_by = auth.uid()
  )
);

create policy "profiles_select_shared_league"
on public.profiles
for select
to authenticated
using (public.shares_league_with_user(id));
