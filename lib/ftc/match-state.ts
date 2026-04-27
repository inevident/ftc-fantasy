import type { FtcMatch } from "@/lib/types";
import { isQualificationLevel } from "@/lib/ftc/tournament-level";

export function isStartedQualificationMatch(match: FtcMatch) {
  if (!isQualificationLevel(match.tournamentLevel)) {
    return false;
  }

  return Boolean(match.actualStartTime || match.scoreBlueFinal > 0 || match.scoreRedFinal > 0);
}

export function getQualificationLockTimestamp(matches: FtcMatch[]) {
  const startedQualificationMatches = matches
    .filter(isStartedQualificationMatch)
    .sort((left, right) => {
      const leftTime = new Date(left.actualStartTime ?? left.modifiedOn ?? 0).getTime();
      const rightTime = new Date(right.actualStartTime ?? right.modifiedOn ?? 0).getTime();
      return leftTime - rightTime;
    });

  const firstMatch = startedQualificationMatches[0];
  if (!firstMatch) {
    return null;
  }

  return firstMatch.actualStartTime ?? firstMatch.modifiedOn ?? new Date().toISOString();
}
