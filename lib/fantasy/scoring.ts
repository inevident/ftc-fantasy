import { scoringRules } from "@/lib/constants";
import type {
  FtcMatch,
  FtcRanking,
  LeaderboardRow,
  ScoreBreakdown,
  TeamScore,
} from "@/lib/types";

type TeamScoreMap = Map<number, ScoreBreakdown[]>;

function addBreakdown(
  scoreMap: TeamScoreMap,
  teamNumber: number,
  label: string,
  points: number,
  sourceKey: string,
  sourceType: string,
) {
  const current = scoreMap.get(teamNumber) ?? [];
  current.push({ label, points, sourceKey, sourceType });
  scoreMap.set(teamNumber, current);
}

function normalizeTournamentLevel(level?: string | null) {
  return (level ?? "").trim().toLowerCase();
}

function getAllianceColor(station?: string | null) {
  const normalized = (station ?? "").toLowerCase();

  if (normalized.startsWith("red")) {
    return "red";
  }

  if (normalized.startsWith("blue")) {
    return "blue";
  }

  return null;
}

function getWinningAlliance(match: FtcMatch) {
  if (match.scoreRedFinal > match.scoreBlueFinal) {
    return "red";
  }

  if (match.scoreBlueFinal > match.scoreRedFinal) {
    return "blue";
  }

  return null;
}

function getAllianceTeams(match: FtcMatch, alliance: "blue" | "red") {
  return (match.teams ?? [])
    .filter((team) => getAllianceColor(team.station) === alliance)
    .map((team) => team.teamNumber);
}

function getRankBonus(rank: number) {
  return scoringRules.rankBonuses.find((rule) => rank <= rule.maxRank)?.points ?? 0;
}

function sortMatches(matches: FtcMatch[]) {
  return [...matches].sort((left, right) => {
    const leftTime = new Date(left.actualStartTime ?? left.modifiedOn ?? 0).getTime();
    const rightTime = new Date(right.actualStartTime ?? right.modifiedOn ?? 0).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    if (left.series !== right.series) {
      return left.series - right.series;
    }

    return left.matchNumber - right.matchNumber;
  });
}

export function scoreDivision(rankings: FtcRanking[], matches: FtcMatch[]) {
  const scoreMap: TeamScoreMap = new Map();

  for (const ranking of rankings) {
    if (ranking.wins > 0) {
      addBreakdown(
        scoreMap,
        ranking.teamNumber,
        "Qualification wins",
        ranking.wins * scoringRules.qualificationWin,
        `qual-wins-${ranking.teamNumber}`,
        "qualification_wins",
      );
    }

    if (ranking.ties > 0) {
      addBreakdown(
        scoreMap,
        ranking.teamNumber,
        "Qualification ties",
        ranking.ties * scoringRules.qualificationTie,
        `qual-ties-${ranking.teamNumber}`,
        "qualification_ties",
      );
    }

    const rankBonus = getRankBonus(ranking.rank);
    if (rankBonus > 0) {
      addBreakdown(
        scoreMap,
        ranking.teamNumber,
        `Rank ${ranking.rank} finish`,
        rankBonus,
        `qual-rank-${ranking.teamNumber}`,
        "rank_bonus",
      );
    }
  }

  const playoffMatches = sortMatches(
    matches.filter((match) => normalizeTournamentLevel(match.tournamentLevel) !== "qual"),
  );

  for (const match of playoffMatches) {
    const winner = getWinningAlliance(match);
    if (!winner) {
      continue;
    }

    for (const teamNumber of getAllianceTeams(match, winner)) {
      addBreakdown(
        scoreMap,
        teamNumber,
        "Playoff win",
        scoringRules.playoffWin,
        `playoff-${match.series}-${match.matchNumber}-${teamNumber}`,
        "playoff_win",
      );
    }
  }

  const finalMatch = playoffMatches.at(-1);
  if (finalMatch) {
    const winner = getWinningAlliance(finalMatch);
    const loser = winner === "red" ? "blue" : winner === "blue" ? "red" : null;

    if (winner && loser) {
      for (const teamNumber of [
        ...getAllianceTeams(finalMatch, winner),
        ...getAllianceTeams(finalMatch, loser),
      ]) {
        addBreakdown(
          scoreMap,
          teamNumber,
          "Division finalist",
          scoringRules.divisionFinalistBonus,
          `division-finalist-${finalMatch.series}-${finalMatch.matchNumber}-${teamNumber}`,
          "division_finalist",
        );
      }

      for (const teamNumber of getAllianceTeams(finalMatch, winner)) {
        addBreakdown(
          scoreMap,
          teamNumber,
          "Division champion",
          scoringRules.divisionChampionBonus,
          `division-champion-${finalMatch.series}-${finalMatch.matchNumber}-${teamNumber}`,
          "division_champion",
        );
      }
    }
  }

  return scoreMap;
}

export function scoreFinalRound(matches: FtcMatch[], sourceType: "champion" | "da_vinci") {
  const sorted = sortMatches(matches);
  const finalMatch = sorted.at(-1);
  const scoreMap: TeamScoreMap = new Map();

  if (!finalMatch) {
    return scoreMap;
  }

  const winner = getWinningAlliance(finalMatch);
  if (!winner) {
    return scoreMap;
  }

  const sourceKeyBase = `${sourceType}-${finalMatch.series}-${finalMatch.matchNumber}`;
  const label =
    sourceType === "champion" ? "Overall champion" : "da Vinci finals berth";
  const points =
    sourceType === "champion"
      ? scoringRules.championBonus
      : scoringRules.daVinciBerthBonus;

  for (const teamNumber of getAllianceTeams(finalMatch, winner)) {
    addBreakdown(scoreMap, teamNumber, label, points, `${sourceKeyBase}-${teamNumber}`, sourceType);
  }

  return scoreMap;
}

export function mergeScoreMaps(...maps: TeamScoreMap[]) {
  const combined: TeamScoreMap = new Map();

  for (const map of maps) {
    for (const [teamNumber, breakdown] of map.entries()) {
      const current = combined.get(teamNumber) ?? [];
      combined.set(teamNumber, [...current, ...breakdown]);
    }
  }

  return combined;
}

export function scoreMapToTeamScores(scoreMap: TeamScoreMap): TeamScore[] {
  return Array.from(scoreMap.entries())
    .map(([teamNumber, breakdown]) => {
      const points = breakdown.reduce((sum, line) => sum + line.points, 0);

      return {
        breakdown: breakdown.sort((left, right) => right.points - left.points),
        highestBreakdown: Math.max(...breakdown.map((line) => line.points), 0),
        points,
        teamNumber,
      };
    })
    .sort((left, right) => right.points - left.points || left.teamNumber - right.teamNumber);
}

export function sortLeaderboard(rows: LeaderboardRow[]) {
  return [...rows].sort((left, right) => {
    if (left.totalPoints !== right.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    if (left.championHit !== right.championHit) {
      return left.championHit ? -1 : 1;
    }

    if (left.highestSingleTeamScore !== right.highestSingleTeamScore) {
      return right.highestSingleTeamScore - left.highestSingleTeamScore;
    }

    return new Date(left.savedAt).getTime() - new Date(right.savedAt).getTime();
  });
}

