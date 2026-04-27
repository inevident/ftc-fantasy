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
  where auth.uid() is not null
    and leagues.invite_code = upper(trim(target_invite_code))
  limit 1;
$$;

create or replace function public.can_edit_entry(target_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entries
    join public.seasons
      on seasons.id = entries.season_id
    where entries.id = target_entry_id
      and entries.user_id = auth.uid()
      and entries.locked_at is null
      and seasons.entries_locked_at is null
      and public.is_league_member(entries.league_id)
  );
$$;

drop policy if exists "entries_insert_owner" on public.entries;
drop policy if exists "entries_update_owner" on public.entries;
drop policy if exists "entry_teams_insert_owner" on public.entry_teams;
drop policy if exists "entry_teams_update_owner" on public.entry_teams;
drop policy if exists "entry_teams_delete_owner" on public.entry_teams;

create policy "entries_insert_owner"
on public.entries
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_league_member(league_id)
  and locked_at is null
  and not exists (
    select 1
    from public.seasons
    where seasons.id = entries.season_id
      and seasons.entries_locked_at is not null
  )
);

create policy "entries_update_owner"
on public.entries
for update
to authenticated
using (public.can_edit_entry(id))
with check (
  auth.uid() = user_id
  and public.is_league_member(league_id)
  and locked_at is null
  and not exists (
    select 1
    from public.seasons
    where seasons.id = entries.season_id
      and seasons.entries_locked_at is not null
  )
);

create policy "entry_teams_insert_owner"
on public.entry_teams
for insert
to authenticated
with check (public.can_edit_entry(entry_id));

create policy "entry_teams_update_owner"
on public.entry_teams
for update
to authenticated
using (public.can_edit_entry(entry_id))
with check (public.can_edit_entry(entry_id));

create policy "entry_teams_delete_owner"
on public.entry_teams
for delete
to authenticated
using (public.can_edit_entry(entry_id));
