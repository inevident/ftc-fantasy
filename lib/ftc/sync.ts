import "server-only";

import { createBaseSeasonSnapshot, seasonConfig } from "@/lib/constants";
import { validateEntrySelection, buildProvisionalTeamPool } from "@/lib/fantasy/divisions";
import { mergeScoreMaps, scoreDivision, scoreFinalRound } from "@/lib/fantasy/scoring";
import {
  fetchChampionshipTeams,
  fetchEventMatches,
  fetchEventRankings,
  fetchSeasonEvents,
} from "@/lib/ftc/client";
import { getQualificationLockTimestamp } from "@/lib/ftc/match-state";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DivisionGroup,
  FtcEvent,
  FtcTeam,
  QualifiedTeam,
  ScoreBreakdown,
  TeamPool,
  TeamPoolSyncResult,
} from "@/lib/types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

function mapFtcTeams(teams: FtcTeam[]): QualifiedTeam[] {
  return [...teams]
    .sort((left, right) => left.teamNumber - right.teamNumber)
    .map((team, index) => ({
      city: team.city,
      country: team.country,
      displayTeamNumber: team.displayTeamNumber,
      divisionCode: "",
      divisionName: "",
      homeRegion: team.homeRegion ?? team.homeCMP ?? null,
      nameFull: team.nameFull,
      nameShort: team.nameShort,
      robotName: team.robotName,
      schoolName: team.schoolName,
      seasonId: seasonConfig.id,
      sortSeed: index,
      stateProv: team.stateProv,
      teamNumber: team.teamNumber,
      website: team.website,
    }));
}

function isChildOfChampionship(event: FtcEvent) {
  return (event.divisionCode ?? "").toUpperCase() === seasonConfig.eventCode;
}

function isDivisionEvent(event: FtcEvent) {
  const name = (event.name ?? "").toLowerCase();

  return (
    isChildOfChampionship(event) &&
    !/da vinci|final/i.test(name) &&
    (event.code ?? "").toUpperCase() !== seasonConfig.eventCode
  );
}

function isDaVinciEvent(event: FtcEvent) {
  return isChildOfChampionship(event) && /da vinci/i.test(event.name ?? "");
}

function isFinalEvent(event: FtcEvent) {
  return isChildOfChampionship(event) && /final/i.test(event.name ?? "");
}

async function resolveOfficialAssignments(baseTeams: QualifiedTeam[]) {
  const events = await fetchSeasonEvents();
  const divisionEvents = events
    .filter(isDivisionEvent)
    .sort((left, right) => (left.name ?? "").localeCompare(right.name ?? ""));

  if (divisionEvents.length < seasonConfig.divisionCount) {
    return null;
  }

  const teamsByDivision = await Promise.all(
    divisionEvents.slice(0, seasonConfig.divisionCount).map(async (event, index) => {
      if (!event.code) {
        return null;
      }

      const teams = await fetchChampionshipTeams(event.code);

      return {
        division: {
          code: `division-${String.fromCharCode(97 + index)}`,
          displayOrder: index,
          name: event.name ?? `Official Division ${index + 1}`,
          officialEventCode: event.code,
          seasonId: seasonConfig.id,
          status: "official" as const,
          teamCount: teams.length,
        },
        teams,
      };
    }),
  );

  const completeDivisions = teamsByDivision.filter(
    (division): division is NonNullable<(typeof teamsByDivision)[number]> =>
      division !== null,
  );
  if (completeDivisions.length < seasonConfig.divisionCount) {
    return null;
  }

  const divisionLookup = new Map<number, DivisionGroup>();
  for (const group of completeDivisions) {
    for (const team of group.teams) {
      divisionLookup.set(team.teamNumber, group.division);
    }
  }

  if (divisionLookup.size !== baseTeams.length) {
    return null;
  }

  return {
    divisions: completeDivisions.map((item) => item.division),
    hasOfficialAssignments: true,
    teams: baseTeams.map((team, index) => {
      const division = divisionLookup.get(team.teamNumber);

      if (!division) {
        throw new Error(`Missing division assignment for team ${team.teamNumber}.`);
      }

      return {
        ...team,
        divisionCode: division.code,
        divisionName: division.name,
        officialEventCode: division.officialEventCode ?? null,
        sortSeed: index,
      };
    }),
  } satisfies TeamPoolSyncResult;
}

function createSeasonPool(syncResult: TeamPoolSyncResult, source: TeamPool["source"]): TeamPool {
  const season = createBaseSeasonSnapshot();

  return {
    divisions: syncResult.divisions,
    season: {
      ...season,
      divisionStatus: syncResult.hasOfficialAssignments ? "official" : "provisional",
      source,
      teamCount: syncResult.teams.length,
    },
    source,
    teams: syncResult.teams,
  };
}

export async function resolveLiveTeamPool() {
  const baseTeams = mapFtcTeams(await fetchChampionshipTeams());
  const officialAssignments = await resolveOfficialAssignments(baseTeams);

  if (officialAssignments) {
    return createSeasonPool(officialAssignments, "live-preview");
  }

  return createSeasonPool(buildProvisionalTeamPool(baseTeams), "live-preview");
}

async function createSyncRun(admin: AdminClient, syncType: "roster" | "scoring") {
  const { data, error } = await admin
    .from("sync_runs")
    .insert({
      season_id: seasonConfig.id,
      started_at: new Date().toISOString(),
      status: "running",
      sync_type: syncType,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function finishSyncRun(
  admin: AdminClient,
  syncRunId: string,
  payload: {
    errorMessage?: string;
    itemCount: number;
    metadata?: Record<string, unknown>;
    status: "error" | "success";
  },
) {
  await admin
    .from("sync_runs")
    .update({
      error_message: payload.errorMessage ?? null,
      finished_at: new Date().toISOString(),
      item_count: payload.itemCount,
      metadata: payload.metadata ?? {},
      status: payload.status,
    })
    .eq("id", syncRunId);
}

async function storeSeasonPool(
  admin: AdminClient,
  syncResult: TeamPoolSyncResult,
) {
  const nowIso = new Date().toISOString();
  const { data: existingSeason, error: existingSeasonError } = await admin
    .from("seasons")
    .select("official_divisions_published_at, entries_locked_at")
    .eq("id", seasonConfig.id)
    .maybeSingle();

  if (existingSeasonError) {
    throw existingSeasonError;
  }

  await admin.from("qualified_teams").delete().eq("season_id", seasonConfig.id);
  await admin.from("division_groups").delete().eq("season_id", seasonConfig.id);

  const { error: seasonError } = await admin.from("seasons").upsert(
    {
      api_season: seasonConfig.apiSeason,
      config: seasonConfig,
      division_count: seasonConfig.divisionCount,
      division_status: syncResult.hasOfficialAssignments ? "official" : "provisional",
      entries_locked_at: (existingSeason?.entries_locked_at as string | null) ?? null,
      event_code: seasonConfig.eventCode,
      id: seasonConfig.id,
      label: seasonConfig.eventName,
      lock_mode: seasonConfig.lockMode,
      official_divisions_published_at:
        (existingSeason?.official_divisions_published_at as string | null) ??
        (syncResult.hasOfficialAssignments ? nowIso : null),
      scoring_preset: seasonConfig.scoringPreset,
      teams_per_division: seasonConfig.teamsPerDivision,
      updated_at: nowIso,
    },
    { onConflict: "id" },
  );

  if (seasonError) {
    throw seasonError;
  }

  const { data: divisionRows, error: divisionError } = await admin
    .from("division_groups")
    .insert(
      syncResult.divisions.map((division) => ({
        code: division.code,
        display_order: division.displayOrder,
        name: division.name,
        official_event_code: division.officialEventCode ?? null,
        season_id: seasonConfig.id,
        status: division.status,
      })),
    )
    .select("id, code");

  if (divisionError) {
    throw divisionError;
  }

  const divisionIdByCode = new Map(
    (divisionRows ?? []).map((row) => [row.code as string, row.id as string]),
  );

  const { error: teamError } = await admin.from("qualified_teams").insert(
    syncResult.teams.map((team) => ({
      city: team.city ?? null,
      country: team.country ?? null,
      display_team_number: team.displayTeamNumber ?? null,
      division_code: team.divisionCode,
      division_group_id: divisionIdByCode.get(team.divisionCode) ?? null,
      division_name: team.divisionName,
      home_region: team.homeRegion ?? null,
      name_full: team.nameFull ?? null,
      name_short: team.nameShort ?? null,
      official_event_code: team.officialEventCode ?? null,
      robot_name: team.robotName ?? null,
      school_name: team.schoolName ?? null,
      season_id: seasonConfig.id,
      sort_seed: team.sortSeed,
      state_prov: team.stateProv ?? null,
      team_number: team.teamNumber,
      website: team.website ?? null,
    })),
  );

  if (teamError) {
    throw teamError;
  }

  const { data: entryRows, error: entryError } = await admin
    .from("entries")
    .select("id")
    .eq("season_id", seasonConfig.id);

  if (entryError) {
    throw entryError;
  }

  if (!entryRows?.length) {
    return;
  }

  const { data: entryTeams, error: entryTeamsError } = await admin
    .from("entry_teams")
    .select("entry_id, slot_number, team_number")
    .in(
      "entry_id",
      entryRows.map((entry) => entry.id as string),
    );

  if (entryTeamsError) {
    throw entryTeamsError;
  }

  const teamLookup = new Map(syncResult.teams.map((team) => [team.teamNumber, team]));
  const entrySelectionMap = new Map<string, number[]>();
  const updatedEntryTeams = (entryTeams ?? []).map((row) => {
    const team = teamLookup.get(row.team_number as number);
    const current = entrySelectionMap.get(row.entry_id as string) ?? [];
    current.push(row.team_number as number);
    entrySelectionMap.set(row.entry_id as string, current);

    return {
      division_group_id: team ? divisionIdByCode.get(team.divisionCode) ?? null : null,
      entry_id: row.entry_id,
      slot_number: row.slot_number,
      team_number: row.team_number,
    };
  });

  if (updatedEntryTeams.length) {
    const { error: updateEntryTeamsError } = await admin
      .from("entry_teams")
      .upsert(updatedEntryTeams, { onConflict: "entry_id,team_number" });

    if (updateEntryTeamsError) {
      throw updateEntryTeamsError;
    }
  }

  await Promise.all(
    entryRows.map(async (entry) => {
      const selectedTeamNumbers = entrySelectionMap.get(entry.id as string) ?? [];
      const invalidReason = validateEntrySelection(selectedTeamNumbers, syncResult.teams);

      const { error } = await admin
        .from("entries")
        .update({
          invalid_reason: invalidReason,
          is_valid: !invalidReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id as string);

      if (error) {
        throw error;
      }
    }),
  );
}

async function lockSeasonEntriesIfNeeded(admin: AdminClient, lockTimestamp: string | null) {
  const { data: seasonRow, error: seasonError } = await admin
    .from("seasons")
    .select("entries_locked_at")
    .eq("id", seasonConfig.id)
    .maybeSingle();

  if (seasonError) {
    throw seasonError;
  }

  const existingLockTimestamp = (seasonRow?.entries_locked_at as string | null) ?? null;
  if (existingLockTimestamp || !lockTimestamp) {
    return existingLockTimestamp;
  }

  const { error: seasonUpdateError } = await admin
    .from("seasons")
    .update({
      entries_locked_at: lockTimestamp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seasonConfig.id)
    .is("entries_locked_at", null);

  if (seasonUpdateError) {
    throw seasonUpdateError;
  }

  const { error: entryUpdateError } = await admin
    .from("entries")
    .update({
      locked_at: lockTimestamp,
      updated_at: new Date().toISOString(),
    })
    .eq("season_id", seasonConfig.id)
    .is("locked_at", null);

  if (entryUpdateError) {
    throw entryUpdateError;
  }

  return lockTimestamp;
}

function scoreBreakdownRows(
  breakdownMap: Map<number, ScoreBreakdown[]>,
  entryId: string,
  leagueId: string,
  teamNumber: number,
) {
  return (breakdownMap.get(teamNumber) ?? []).map((line) => ({
    entry_id: entryId,
    league_id: leagueId,
    payload: {
      label: line.label,
    },
    points: line.points,
    season_id: seasonConfig.id,
    source_key: line.sourceKey,
    source_type: line.sourceType,
    team_number: teamNumber,
  }));
}

async function detectBonusEvents() {
  const events = await fetchSeasonEvents();

  return {
    daVinciEventCode: events.find(isDaVinciEvent)?.code ?? null,
    finalsEventCode:
      events.find(isFinalEvent)?.code ?? events.find((event) => event.code === seasonConfig.eventCode)?.code ?? null,
  };
}

export async function runRosterSync(options?: { dryRun?: boolean }) {
  const syncResult = await (async () => {
    const baseTeams = mapFtcTeams(await fetchChampionshipTeams());
    return (await resolveOfficialAssignments(baseTeams)) ?? buildProvisionalTeamPool(baseTeams);
  })();

  if (options?.dryRun) {
    return {
      itemCount: syncResult.teams.length,
      metadata: {
        divisionStatus: syncResult.hasOfficialAssignments ? "official" : "provisional",
      },
      persisted: false,
      syncResult,
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for persistent roster sync.");
  }

  const syncRunId = await createSyncRun(admin, "roster");

  try {
    await storeSeasonPool(admin, syncResult);
    await finishSyncRun(admin, syncRunId, {
      itemCount: syncResult.teams.length,
      metadata: {
        divisionStatus: syncResult.hasOfficialAssignments ? "official" : "provisional",
      },
      status: "success",
    });

    return {
      itemCount: syncResult.teams.length,
      metadata: {
        divisionStatus: syncResult.hasOfficialAssignments ? "official" : "provisional",
      },
      persisted: true,
      syncResult,
    };
  } catch (error) {
    await finishSyncRun(admin, syncRunId, {
      errorMessage: error instanceof Error ? error.message : "Roster sync failed.",
      itemCount: 0,
      metadata: {},
      status: "error",
    });
    throw error;
  }
}

export async function runScoringSync(options?: { dryRun?: boolean }) {
  const admin = options?.dryRun ? null : createAdminClient();

  if (!options?.dryRun && !admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for scoring sync.");
  }

  const divisionPool = options?.dryRun
    ? await resolveLiveTeamPool()
    : createSeasonPool(
        {
          divisions: [],
          hasOfficialAssignments: false,
          teams: [],
        },
        "database",
      );

  const livePool = options?.dryRun ? divisionPool : await resolveLiveTeamPool();
  const officialDivisions = livePool.divisions.filter((division) => division.officialEventCode);
  const waitingMessage = "Official divisions have not been published yet.";

  if (!officialDivisions.length) {
    if (options?.dryRun) {
      return {
        itemCount: 0,
        metadata: {
          message: waitingMessage,
        },
        persisted: false,
      };
    }

    const syncRunId = await createSyncRun(admin!, "scoring");
    await finishSyncRun(admin!, syncRunId, {
      itemCount: 0,
      metadata: {
        message: waitingMessage,
      },
      status: "success",
    });

    return {
      itemCount: 0,
      metadata: {
        message: waitingMessage,
      },
      persisted: true,
    };
  }

  const divisionResults = await Promise.all(
    officialDivisions.map(async (division) => {
      const eventCode = division.officialEventCode!;
      const [rankings, matches] = await Promise.all([
        fetchEventRankings(eventCode),
        fetchEventMatches(eventCode),
      ]);

      return {
        eventCode,
        matches,
        scoreMap: scoreDivision(rankings, matches),
      };
    }),
  );
  const qualificationLockTimestamp = getQualificationLockTimestamp(
    divisionResults.flatMap((division) => division.matches),
  );

  const bonusEvents = await detectBonusEvents();
  const bonusMaps: Array<Map<number, ScoreBreakdown[]>> = [];

  if (bonusEvents.daVinciEventCode) {
    bonusMaps.push(scoreFinalRound(await fetchEventMatches(bonusEvents.daVinciEventCode), "da_vinci"));
  }

  if (bonusEvents.finalsEventCode) {
    bonusMaps.push(scoreFinalRound(await fetchEventMatches(bonusEvents.finalsEventCode), "champion"));
  }

  const mergedScores = mergeScoreMaps(
    ...divisionResults.map((division) => division.scoreMap),
    ...bonusMaps,
  );

  if (options?.dryRun) {
    return {
      itemCount: Array.from(mergedScores.keys()).length,
      metadata: {
        daVinciEventCode: bonusEvents.daVinciEventCode,
        finalsEventCode: bonusEvents.finalsEventCode,
        qualificationLockTimestamp,
      },
      persisted: false,
    };
  }

  const syncRunId = await createSyncRun(admin!, "scoring");

  try {
    const { data: entries, error: entriesError } = await admin!
      .from("entries")
      .select("id, league_id")
      .eq("season_id", seasonConfig.id);

    if (entriesError) {
      throw entriesError;
    }

    const { data: entryTeams, error: entryTeamsError } = await admin!
      .from("entry_teams")
      .select("entry_id, team_number")
      .in(
        "entry_id",
        (entries ?? []).map((entry) => entry.id as string),
      );

    if (entryTeamsError) {
      throw entryTeamsError;
    }

    await admin!.from("score_ledgers").delete().eq("season_id", seasonConfig.id);

    const entryLookup = new Map((entries ?? []).map((entry) => [entry.id as string, entry]));
    const ledgerRows = (entryTeams ?? []).flatMap((row) => {
      const entry = entryLookup.get(row.entry_id as string);

      if (!entry) {
        return [];
      }

      return scoreBreakdownRows(
        mergedScores,
        row.entry_id as string,
        entry.league_id as string,
        row.team_number as number,
      );
    });

    for (let index = 0; index < ledgerRows.length; index += 500) {
      const slice = ledgerRows.slice(index, index + 500);

      if (!slice.length) {
        continue;
      }

      const { error } = await admin!.from("score_ledgers").insert(slice);

      if (error) {
        throw error;
      }
    }

    const appliedLockTimestamp = await lockSeasonEntriesIfNeeded(admin!, qualificationLockTimestamp);

    await finishSyncRun(admin!, syncRunId, {
      itemCount: ledgerRows.length,
      metadata: {
        daVinciEventCode: bonusEvents.daVinciEventCode,
        finalsEventCode: bonusEvents.finalsEventCode,
        qualificationLockTimestamp: appliedLockTimestamp,
      },
      status: "success",
    });

    return {
      itemCount: ledgerRows.length,
      metadata: {
        daVinciEventCode: bonusEvents.daVinciEventCode,
        finalsEventCode: bonusEvents.finalsEventCode,
        qualificationLockTimestamp: appliedLockTimestamp,
      },
      persisted: true,
    };
  } catch (error) {
    await finishSyncRun(admin!, syncRunId, {
      errorMessage: error instanceof Error ? error.message : "Scoring sync failed.",
      itemCount: 0,
      metadata: {},
      status: "error",
    });
    throw error;
  }
}
