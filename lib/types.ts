export type DivisionStatus = "official" | "provisional";
export type TeamPoolSource = "database" | "live-preview" | "none";
export type SyncType = "roster" | "scoring";
export type SyncRunStatus = "error" | "running" | "success";

export type ActionState = {
  status: "error" | "idle" | "success";
  message?: string;
};

export type DivisionGroup = {
  code: string;
  displayOrder: number;
  id?: string;
  name: string;
  officialEventCode?: string | null;
  seasonId: string;
  status: DivisionStatus;
  teamCount?: number;
};

export type QualifiedTeam = {
  city?: string | null;
  country?: string | null;
  displayTeamNumber?: string | null;
  divisionCode: string;
  divisionGroupId?: string | null;
  divisionName: string;
  homeRegion?: string | null;
  nameFull?: string | null;
  nameShort?: string | null;
  officialEventCode?: string | null;
  robotName?: string | null;
  schoolName?: string | null;
  seasonId: string;
  sortSeed: number;
  stateProv?: string | null;
  teamNumber: number;
  website?: string | null;
};

export type SyncRunSummary = {
  errorMessage?: string | null;
  finishedAt?: string | null;
  itemCount: number;
  metadata?: Record<string, unknown> | null;
  startedAt: string;
  status: SyncRunStatus;
  syncType: SyncType;
};

export type SeasonSnapshot = {
  apiSeason: number;
  divisionCount: number;
  divisionStatus: DivisionStatus;
  entryPickCount: number;
  eventCode: string;
  label: string;
  latestSync: SyncRunSummary | null;
  lockMode: string;
  note?: string;
  source: TeamPoolSource;
  teamCount: number;
  teamsPerDivision: number;
};

export type TeamPool = {
  divisions: DivisionGroup[];
  message?: string;
  season: SeasonSnapshot;
  source: TeamPoolSource;
  teams: QualifiedTeam[];
};

export type LeagueSummary = {
  createdAt: string;
  entryCount: number;
  id: string;
  inviteCode: string;
  memberCount: number;
  name: string;
  role: string;
};

export type LeagueMemberView = {
  displayName: string;
  email?: string | null;
  joinedAt: string;
  role: string;
  userId: string;
};

export type ScoreBreakdown = {
  label: string;
  points: number;
  sourceKey: string;
  sourceType: string;
};

export type TeamScore = {
  breakdown: ScoreBreakdown[];
  highestBreakdown: number;
  points: number;
  teamNumber: number;
};

export type LeaderboardRow = {
  championHit: boolean;
  championPickTeamNumber?: number | null;
  entryId: string;
  entryName: string;
  highestSingleTeamScore: number;
  invalidReason?: string | null;
  isValid: boolean;
  savedAt: string;
  teamScores: TeamScore[];
  totalPoints: number;
  userId: string;
  userLabel: string;
};

export type LeagueDetail = {
  currentUserEntryId?: string | null;
  entryLocked: boolean;
  id: string;
  inviteCode: string;
  isMember: boolean;
  leaderboard: LeaderboardRow[];
  members: LeagueMemberView[];
  name: string;
};

export type EntrySelection = {
  championPickTeamNumber?: number | null;
  entryId: string;
  entryName: string;
  invalidReason?: string | null;
  isLocked: boolean;
  isValid: boolean;
  leagueCode: string;
  leagueId: string;
  leagueName: string;
  savedAt: string;
  selectedTeamNumbers: number[];
  userId: string;
};

export type DashboardData = {
  leagues: LeagueSummary[];
  seasonPool: TeamPool;
  setupMessage?: string;
  userEmail?: string | null;
  userId: string;
};

export type LeaguePageData =
  | {
      kind: "missing";
      seasonPool: TeamPool;
    }
  | {
      kind: "ready";
      league: LeagueDetail;
      seasonPool: TeamPool;
    };

export type EntryPageData =
  | {
      kind: "missing";
      seasonPool: TeamPool;
    }
  | {
      entry: EntrySelection;
      kind: "ready";
      seasonPool: TeamPool;
    };

export type FtcTeam = {
  city?: string | null;
  country?: string | null;
  displayLocation?: string | null;
  displayTeamNumber?: string | null;
  homeCMP?: string | null;
  homeRegion?: string | null;
  nameFull?: string | null;
  nameShort?: string | null;
  robotName?: string | null;
  schoolName?: string | null;
  stateProv?: string | null;
  teamNumber: number;
  website?: string | null;
};

export type FtcEvent = {
  code?: string | null;
  dateEnd: string;
  dateStart: string;
  divisionCode?: string | null;
  name?: string | null;
  timezone?: string | null;
  typeName?: string | null;
};

export type FtcRanking = {
  matchesPlayed: number;
  rank: number;
  teamNumber: number;
  ties: number;
  wins: number;
};

export type FtcMatchTeam = {
  station?: string | null;
  teamNumber: number;
};

export type FtcMatch = {
  actualStartTime?: string | null;
  description?: string | null;
  matchNumber: number;
  modifiedOn?: string | null;
  scoreBlueFinal: number;
  scoreRedFinal: number;
  series: number;
  teams?: FtcMatchTeam[] | null;
  tournamentLevel?: string | null;
};

export type TeamPoolSyncResult = {
  divisions: DivisionGroup[];
  hasOfficialAssignments: boolean;
  teams: QualifiedTeam[];
};
