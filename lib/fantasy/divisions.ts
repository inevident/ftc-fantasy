import { seasonConfig } from "@/lib/constants";
import type { DivisionGroup, QualifiedTeam, TeamPoolSyncResult } from "@/lib/types";

function createProvisionalDivisions(): DivisionGroup[] {
  return seasonConfig.divisionLabels.map((name, index) => ({
    code: `division-${String.fromCharCode(97 + index)}`,
    displayOrder: index,
    name,
    seasonId: seasonConfig.id,
    status: "provisional",
  }));
}

export function buildProvisionalTeamPool(teams: QualifiedTeam[]): TeamPoolSyncResult {
  const divisions = createProvisionalDivisions();
  const sortedTeams = [...teams].sort((left, right) => left.teamNumber - right.teamNumber);

  const assignedTeams = sortedTeams.map((team, index) => {
    const row = Math.floor(index / divisions.length);
    const column = index % divisions.length;
    const divisionIndex =
      row % 2 === 0 ? column : divisions.length - 1 - column;
    const division = divisions[divisionIndex];

    return {
      ...team,
      divisionCode: division.code,
      divisionName: division.name,
      officialEventCode: division.officialEventCode ?? null,
      sortSeed: index,
    };
  });

  const counts = assignedTeams.reduce<Record<string, number>>((accumulator, team) => {
    accumulator[team.divisionCode] = (accumulator[team.divisionCode] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    divisions: divisions.map((division) => ({
      ...division,
      teamCount: counts[division.code] ?? 0,
    })),
    hasOfficialAssignments: false,
    teams: assignedTeams,
  };
}

export function countTeamsByDivision(teamNumbers: number[], teams: QualifiedTeam[]) {
  const teamLookup = new Map(teams.map((team) => [team.teamNumber, team]));

  return teamNumbers.reduce<Record<string, number>>((accumulator, teamNumber) => {
    const team = teamLookup.get(teamNumber);

    if (!team) {
      return accumulator;
    }

    accumulator[team.divisionCode] = (accumulator[team.divisionCode] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function validateEntrySelection(teamNumbers: number[], teams: QualifiedTeam[]) {
  if (teamNumbers.length !== seasonConfig.rosterPickCount) {
    return `Entries must contain exactly ${seasonConfig.rosterPickCount} teams.`;
  }

  if (new Set(teamNumbers).size !== teamNumbers.length) {
    return "Each roster spot must be a unique team.";
  }

  const teamLookup = new Map(teams.map((team) => [team.teamNumber, team]));
  const missingTeamNumber = teamNumbers.find((teamNumber) => !teamLookup.has(teamNumber));

  if (missingTeamNumber) {
    return `Team ${missingTeamNumber} is no longer in the official Worlds draft pool.`;
  }

  const counts = countTeamsByDivision(teamNumbers, teams);
  const divisionCodes = Array.from(new Set(teams.map((team) => team.divisionCode)));
  const invalidDivision = divisionCodes.find(
    (divisionCode) => counts[divisionCode] !== seasonConfig.teamsPerDivision,
  );

  if (invalidDivision) {
    return `Each division requires exactly ${seasonConfig.teamsPerDivision} teams.`;
  }

  return null;
}
