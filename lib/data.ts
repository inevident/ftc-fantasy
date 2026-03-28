import "server-only";

import { createBaseSeasonSnapshot, seasonConfig } from "@/lib/constants";
import { getSetupChecklist, hasFtcApiConfig, hasSupabaseConfig } from "@/lib/env";
import { sortLeaderboard, scoreMapToTeamScores } from "@/lib/fantasy/scoring";
import { resolveLiveTeamPool } from "@/lib/ftc/sync";
import type {
  DashboardData,
  EntryPageData,
  LeaguePageData,
  LeaderboardRow,
  QualifiedTeam,
  ScoreBreakdown,
  SyncRunSummary,
  TeamPool,
} from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  return code === "42P01" || code === "PGRST205";
}

function createEmptyPool(message?: string): TeamPool {
  return {
    divisions: [],
    message,
    season: createBaseSeasonSnapshot(),
    source: "none",
    teams: [],
  };
}

function toSyncSummary(
  row:
    | {
        error_message?: string | null;
        finished_at?: string | null;
        item_count?: number | null;
        metadata?: Record<string, unknown> | null;
        started_at: string;
        status: "error" | "running" | "success";
        sync_type: "roster" | "scoring";
      }
    | null
    | undefined,
): SyncRunSummary | null {
  if (!row) {
    return null;
  }

  return {
    errorMessage: row.error_message ?? null,
    finishedAt: row.finished_at ?? null,
    itemCount: row.item_count ?? 0,
    metadata: row.metadata ?? null,
    startedAt: row.started_at,
    status: row.status,
    syncType: row.sync_type,
  };
}

async function getDatabaseSeasonPool(): Promise<TeamPool | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const [seasonResponse, divisionsResponse, teamsResponse, syncResponse] = await Promise.all([
    supabase.from("seasons").select("*").eq("id", seasonConfig.id).maybeSingle(),
    supabase
      .from("division_groups")
      .select("*")
      .eq("season_id", seasonConfig.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("qualified_teams")
      .select("*")
      .eq("season_id", seasonConfig.id)
      .order("team_number", { ascending: true }),
    supabase
      .from("sync_runs")
      .select("*")
      .eq("season_id", seasonConfig.id)
      .in("sync_type", ["roster", "scoring"])
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const firstError =
    seasonResponse.error ??
    divisionsResponse.error ??
    teamsResponse.error ??
    syncResponse.error;

  if (firstError) {
    if (isMissingTableError(firstError)) {
      return null;
    }

    throw firstError;
  }

  const divisions = (divisionsResponse.data ?? []).map((row) => ({
    code: row.code as string,
    displayOrder: row.display_order as number,
    id: row.id as string,
    name: row.name as string,
    officialEventCode: (row.official_event_code as string | null) ?? null,
    seasonId: row.season_id as string,
    status: row.status as "official" | "provisional",
    teamCount: (teamsResponse.data ?? []).filter((team) => team.division_code === row.code).length,
  }));

  const teams = (teamsResponse.data ?? []).map((row, index) => ({
    city: (row.city as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    displayTeamNumber: (row.display_team_number as string | null) ?? null,
    divisionCode: row.division_code as string,
    divisionGroupId: (row.division_group_id as string | null) ?? null,
    divisionName: row.division_name as string,
    homeRegion: (row.home_region as string | null) ?? null,
    nameFull: (row.name_full as string | null) ?? null,
    nameShort: (row.name_short as string | null) ?? null,
    officialEventCode: (row.official_event_code as string | null) ?? null,
    robotName: (row.robot_name as string | null) ?? null,
    schoolName: (row.school_name as string | null) ?? null,
    seasonId: row.season_id as string,
    sortSeed: (row.sort_seed as number) ?? index,
    stateProv: (row.state_prov as string | null) ?? null,
    teamNumber: row.team_number as number,
    website: (row.website as string | null) ?? null,
  })) satisfies QualifiedTeam[];

  if (!teams.length) {
    return null;
  }

  const seasonRow = seasonResponse.data;
  const syncRows = syncResponse.data ?? [];
  const latestRosterRow = syncRows.find((row) => row.sync_type === "roster");
  const latestScoringRow = syncRows.find((row) => row.sync_type === "scoring");
  const latestRosterSync = toSyncSummary(
    latestRosterRow
      ? {
          error_message: (latestRosterRow.error_message as string | null) ?? null,
          finished_at: (latestRosterRow.finished_at as string | null) ?? null,
          item_count: (latestRosterRow.item_count as number | null) ?? 0,
          metadata: (latestRosterRow.metadata as Record<string, unknown> | null) ?? null,
          started_at: latestRosterRow.started_at as string,
          status: latestRosterRow.status as "error" | "running" | "success",
          sync_type: "roster",
        }
      : null,
  );
  const latestScoringSync = toSyncSummary(
    latestScoringRow
      ? {
          error_message: (latestScoringRow.error_message as string | null) ?? null,
          finished_at: (latestScoringRow.finished_at as string | null) ?? null,
          item_count: (latestScoringRow.item_count as number | null) ?? 0,
          metadata: (latestScoringRow.metadata as Record<string, unknown> | null) ?? null,
          started_at: latestScoringRow.started_at as string,
          status: latestScoringRow.status as "error" | "running" | "success",
          sync_type: "scoring",
        }
      : null,
  );

  return {
    divisions,
    season: {
      apiSeason: (seasonRow?.api_season as number) ?? seasonConfig.apiSeason,
      divisionCount: (seasonRow?.division_count as number) ?? seasonConfig.divisionCount,
      divisionStatus:
        ((seasonRow?.division_status as "official" | "provisional") ?? "provisional"),
      entriesLockedAt: (seasonRow?.entries_locked_at as string | null) ?? null,
      entryPickCount: seasonConfig.rosterPickCount,
      eventCode: (seasonRow?.event_code as string) ?? seasonConfig.eventCode,
      label: (seasonRow?.label as string) ?? seasonConfig.eventName,
      latestRosterSync,
      latestScoringSync,
      lockMode: (seasonRow?.lock_mode as string) ?? seasonConfig.lockMode,
      officialDivisionsPublishedAt:
        (seasonRow?.official_divisions_published_at as string | null) ?? null,
      source: "database",
      teamCount: teams.length,
      teamsPerDivision: (seasonRow?.teams_per_division as number) ?? seasonConfig.teamsPerDivision,
    },
    source: "database",
    teams,
  };
}

export async function getSeasonPool() {
  if (hasSupabaseConfig()) {
    const databasePool = await getDatabaseSeasonPool();
    if (databasePool) {
      return databasePool;
    }
  }

  if (hasFtcApiConfig()) {
    const livePool = await resolveLiveTeamPool();
    return {
      ...livePool,
      message:
        "Showing a live FTC preview because the Supabase tables are empty or not yet migrated.",
    };
  }

  return createEmptyPool(getSetupChecklist().join(" "));
}

async function getLeagueCounts(leagueIds: string[]) {
  const supabase = await createClient();
  if (!supabase || !leagueIds.length) {
    return {
      entryCounts: new Map<string, number>(),
      memberCounts: new Map<string, number>(),
    };
  }

  const [membersResponse, entriesResponse] = await Promise.all([
    supabase.from("league_members").select("league_id").in("league_id", leagueIds),
    supabase.from("entries").select("league_id").in("league_id", leagueIds),
  ]);

  const memberCounts = new Map<string, number>();
  const entryCounts = new Map<string, number>();

  for (const row of membersResponse.data ?? []) {
    const leagueId = row.league_id as string;
    memberCounts.set(leagueId, (memberCounts.get(leagueId) ?? 0) + 1);
  }

  for (const row of entriesResponse.data ?? []) {
    const leagueId = row.league_id as string;
    entryCounts.set(leagueId, (entryCounts.get(leagueId) ?? 0) + 1);
  }

  return { entryCounts, memberCounts };
}

export async function loadDashboardData(userId: string, userEmail?: string | null): Promise<DashboardData> {
  const seasonPool = await getSeasonPool();
  const supabase = await createClient();

  if (!supabase) {
    return {
      leagues: [],
      seasonPool,
      setupMessage: getSetupChecklist().join(" "),
      userEmail,
      userId,
    };
  }

  const membershipsResponse = await supabase
    .from("league_members")
    .select("league_id, role, leagues!inner(id, invite_code, name, created_at)")
    .eq("user_id", userId);

  if (membershipsResponse.error) {
    if (isMissingTableError(membershipsResponse.error)) {
      return {
        leagues: [],
        seasonPool,
        setupMessage:
          "Supabase tables are missing. Run the migration in supabase/migrations before creating leagues.",
        userEmail,
        userId,
      };
    }

    throw membershipsResponse.error;
  }

  const memberships = membershipsResponse.data ?? [];
  const leagueIds = memberships.map((membership) => membership.league_id as string);
  const counts = await getLeagueCounts(leagueIds);

  return {
    leagues: memberships.flatMap((membership) => {
      const rawLeague = Array.isArray(membership.leagues)
        ? membership.leagues[0]
        : membership.leagues;

      if (!rawLeague) {
        return [];
      }

      const league = rawLeague as {
        created_at: string;
        id: string;
        invite_code: string;
        name: string;
      };

      return {
        createdAt: league.created_at,
        entryCount: counts.entryCounts.get(league.id) ?? 0,
        id: league.id,
        inviteCode: league.invite_code,
        memberCount: counts.memberCounts.get(league.id) ?? 1,
        name: league.name,
        role: membership.role as string,
      };
    }),
    seasonPool,
    userEmail,
    userId,
  };
}

async function getProfileMap(userIds: string[]) {
  const supabase = await createClient();
  if (!supabase || !userIds.length) {
    return new Map<string, { display_name?: string | null; email?: string | null }>();
  }

  const response = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds);

  if (response.error) {
    return new Map();
  }

  return new Map(
    (response.data ?? []).map((row) => [
      row.id as string,
      {
        display_name: (row.display_name as string | null) ?? null,
        email: (row.email as string | null) ?? null,
      },
    ]),
  );
}

function buildLeaderboardRows(params: {
  championWinningTeamNumbers: Set<number>;
  entries: Array<{
    champion_pick_team_number?: number | null;
    id: string;
    invalid_reason?: string | null;
    is_valid?: boolean | null;
    league_id: string;
    name: string;
    saved_at: string;
    user_id: string;
  }>;
  ledgerRows: Array<{
    entry_id: string;
    payload?: { label?: string | null } | null;
    points: number;
    source_key: string;
    source_type: string;
    team_number: number;
  }>;
  profiles: Map<string, { display_name?: string | null; email?: string | null }>;
}): LeaderboardRow[] {
  const scoreMapByEntry = new Map<string, Map<number, ScoreBreakdown[]>>();

  for (const row of params.ledgerRows) {
    const currentTeamMap = scoreMapByEntry.get(row.entry_id) ?? new Map<number, ScoreBreakdown[]>();
    const currentBreakdowns = currentTeamMap.get(row.team_number) ?? [];
    currentBreakdowns.push({
      label: row.payload?.label ?? "Scoring event",
      points: row.points,
      sourceKey: row.source_key,
      sourceType: row.source_type,
    });
    currentTeamMap.set(row.team_number, currentBreakdowns);
    scoreMapByEntry.set(row.entry_id, currentTeamMap);
  }

  return sortLeaderboard(
    params.entries.map((entry) => {
      const scoreMap = scoreMapByEntry.get(entry.id) ?? new Map<number, ScoreBreakdown[]>();
      const teamScores = scoreMapToTeamScores(scoreMap);
      const profile = params.profiles.get(entry.user_id);

      return {
        championHit:
          entry.champion_pick_team_number !== null &&
          entry.champion_pick_team_number !== undefined &&
          params.championWinningTeamNumbers.has(entry.champion_pick_team_number),
        championPickTeamNumber: entry.champion_pick_team_number ?? null,
        entryId: entry.id,
        entryName: entry.name,
        highestSingleTeamScore: Math.max(...teamScores.map((score) => score.points), 0),
        invalidReason: entry.invalid_reason ?? null,
        isValid: entry.is_valid ?? true,
        savedAt: entry.saved_at,
        teamScores,
        totalPoints: teamScores.reduce((sum, score) => sum + score.points, 0),
        userId: entry.user_id,
        userLabel:
          profile?.display_name ??
          profile?.email?.split("@")[0] ??
          `Manager ${entry.user_id.slice(0, 6)}`,
      };
    }),
  );
}

export async function loadLeaguePageData(leagueCode: string, userId: string): Promise<LeaguePageData> {
  const seasonPool = await getSeasonPool();
  const supabase = await createClient();

  if (!supabase) {
    return { kind: "missing", seasonPool };
  }

  const leagueResponse = await supabase
    .rpc("get_league_preview_by_invite", {
      target_invite_code: leagueCode.toUpperCase(),
    })
    .maybeSingle();

  if (leagueResponse.error) {
    if (isMissingTableError(leagueResponse.error)) {
      return { kind: "missing", seasonPool };
    }

    throw leagueResponse.error;
  }

  if (!leagueResponse.data) {
    return { kind: "missing", seasonPool };
  }

  const league = leagueResponse.data as
    | { invite_code: string; league_id: string; name: string }
    | null;

  if (!league) {
    return { kind: "missing", seasonPool };
  }

  const membershipResponse = await supabase
    .from("league_members")
    .select("user_id, role, joined_at")
    .eq("league_id", league.league_id);

  if (membershipResponse.error) {
    if (isMissingTableError(membershipResponse.error)) {
      return { kind: "missing", seasonPool };
    }

    throw membershipResponse.error;
  }

  const memberships = membershipResponse.data ?? [];
  const isMember = memberships.some((membership) => membership.user_id === userId);
  const profileMap = await getProfileMap(memberships.map((membership) => membership.user_id as string));

  const members = memberships.map((membership) => {
    const profile = profileMap.get(membership.user_id as string);

    return {
      displayName:
        profile?.display_name ??
        profile?.email?.split("@")[0] ??
        `Manager ${(membership.user_id as string).slice(0, 6)}`,
      email: profile?.email ?? null,
      joinedAt: membership.joined_at as string,
      role: membership.role as string,
      userId: membership.user_id as string,
    };
  });

  if (!isMember) {
    return {
      kind: "ready",
      league: {
        currentUserEntryId: null,
        entryLocked: Boolean(seasonPool.season.entriesLockedAt),
        id: league.league_id,
        inviteCode: league.invite_code,
        isMember: false,
        leaderboard: [],
        members: [],
        name: league.name,
      },
      seasonPool,
    };
  }

  const [entriesResponse, ledgerResponse] = await Promise.all([
    supabase
      .from("entries")
      .select("id, name, user_id, league_id, saved_at, is_valid, invalid_reason, champion_pick_team_number")
      .eq("league_id", league.league_id),
    supabase
      .from("score_ledgers")
      .select("entry_id, team_number, points, source_key, source_type, payload")
      .eq("league_id", league.league_id),
  ]);

  if (entriesResponse.error || ledgerResponse.error) {
    throw entriesResponse.error ?? ledgerResponse.error;
  }

  const entries = (entriesResponse.data ?? []).map((row) => ({
    champion_pick_team_number: (row.champion_pick_team_number as number | null) ?? null,
    id: row.id as string,
    invalid_reason: (row.invalid_reason as string | null) ?? null,
    is_valid: (row.is_valid as boolean | null) ?? true,
    league_id: row.league_id as string,
    name: row.name as string,
    saved_at: row.saved_at as string,
    user_id: row.user_id as string,
  }));

  const championWinningTeamNumbers = new Set<number>(
    (ledgerResponse.data ?? [])
      .filter((row) => row.source_type === "champion")
      .map((row) => row.team_number as number),
  );

  return {
    kind: "ready",
    league: {
      currentUserEntryId: entries.find((entry) => entry.user_id === userId)?.id ?? null,
      entryLocked: Boolean(seasonPool.season.entriesLockedAt),
      id: league.league_id,
      inviteCode: league.invite_code,
      isMember: true,
      leaderboard: buildLeaderboardRows({
        championWinningTeamNumbers,
        entries,
        ledgerRows: (ledgerResponse.data ?? []).map((row) => ({
          entry_id: row.entry_id as string,
          payload: (row.payload as { label?: string | null } | null) ?? null,
          points: row.points as number,
          source_key: row.source_key as string,
          source_type: row.source_type as string,
          team_number: row.team_number as number,
        })),
        profiles: profileMap,
      }),
      members,
      name: league.name,
    },
    seasonPool,
  };
}

export async function loadEntryPageData(entryId: string, userId: string): Promise<EntryPageData> {
  const seasonPool = await getSeasonPool();
  const supabase = await createClient();

  if (!supabase) {
    return { kind: "missing", seasonPool };
  }

  const entryResponse = await supabase
    .from("entries")
    .select("id, league_id, user_id, name, champion_pick_team_number, is_valid, invalid_reason, saved_at, locked_at, leagues!inner(name, invite_code)")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (entryResponse.error) {
    if (isMissingTableError(entryResponse.error)) {
      return { kind: "missing", seasonPool };
    }

    throw entryResponse.error;
  }

  if (!entryResponse.data) {
    return { kind: "missing", seasonPool };
  }

  const teamResponse = await supabase
    .from("entry_teams")
    .select("team_number")
    .eq("entry_id", entryId)
    .order("slot_number", { ascending: true });

  if (teamResponse.error) {
    throw teamResponse.error;
  }

  const rawLeague = Array.isArray(entryResponse.data.leagues)
    ? entryResponse.data.leagues[0]
    : entryResponse.data.leagues;

  if (!rawLeague) {
    return { kind: "missing", seasonPool };
  }

  const league = rawLeague as { invite_code: string; name: string };

  return {
    entry: {
      championPickTeamNumber: (entryResponse.data.champion_pick_team_number as number | null) ?? null,
      entryId: entryResponse.data.id as string,
      entryName: entryResponse.data.name as string,
      invalidReason: (entryResponse.data.invalid_reason as string | null) ?? null,
      isLocked: Boolean(entryResponse.data.locked_at || seasonPool.season.entriesLockedAt),
      isValid: (entryResponse.data.is_valid as boolean | null) ?? true,
      leagueCode: league.invite_code,
      leagueId: entryResponse.data.league_id as string,
      leagueName: league.name,
      savedAt: entryResponse.data.saved_at as string,
      selectedTeamNumbers: (teamResponse.data ?? []).map((row) => row.team_number as number),
      userId: entryResponse.data.user_id as string,
    },
    kind: "ready",
    seasonPool,
  };
}
