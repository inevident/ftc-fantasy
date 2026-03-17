import type { SeasonSnapshot } from "@/lib/types";

export const divisionLabels = [
  "Division A",
  "Division B",
  "Division C",
  "Division D",
  "Division E",
  "Division F",
] as const;

export const scoringRules = {
  championBonus: 15,
  daVinciBerthBonus: 10,
  divisionChampionBonus: 8,
  divisionFinalistBonus: 4,
  playoffWin: 3,
  qualificationTie: 1,
  qualificationWin: 2,
  rankBonuses: [
    { maxRank: 1, points: 10 },
    { maxRank: 4, points: 7 },
    { maxRank: 8, points: 5 },
    { maxRank: 16, points: 3 },
    { maxRank: 32, points: 1 },
  ],
} as const;

export const seasonConfig = {
  apiSeason: 2025,
  divisionCount: 6,
  divisionLabels,
  eventCode: "FTCCMP1",
  eventName: "FTC Fantasy Worlds 2026",
  id: "ftc-worlds-2026",
  lockMode: "post-official-divisions-until-first-worlds-qual-match",
  rosterPickCount: 12,
  scoringPreset: "simple-balanced-match-only",
  teamsPerDivision: 2,
} as const;

export function createBaseSeasonSnapshot(): SeasonSnapshot {
  return {
    apiSeason: seasonConfig.apiSeason,
    divisionCount: seasonConfig.divisionCount,
    divisionStatus: "provisional",
    entryPickCount: seasonConfig.rosterPickCount,
    eventCode: seasonConfig.eventCode,
    label: seasonConfig.eventName,
    latestSync: null,
    lockMode: seasonConfig.lockMode,
    source: "none",
    teamCount: 0,
    teamsPerDivision: seasonConfig.teamsPerDivision,
  };
}

export const magicLinkRedirectPath = "/dashboard";

