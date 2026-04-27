import { describe, expect, it } from "vitest";

import { buildProvisionalTeamPool, validateEntrySelection } from "@/lib/fantasy/divisions";
import type { QualifiedTeam } from "@/lib/types";

function createTeams(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const teamNumber = index + 1;

    return {
      divisionCode: "",
      divisionName: "",
      nameShort: `Team ${teamNumber}`,
      seasonId: "ftc-worlds-2026",
      sortSeed: index,
      teamNumber,
    } satisfies QualifiedTeam;
  });
}

describe("buildProvisionalTeamPool", () => {
  it("creates balanced deterministic snake divisions", () => {
    const firstRun = buildProvisionalTeamPool(createTeams(24));
    const secondRun = buildProvisionalTeamPool(createTeams(24));

    expect(firstRun.teams.map((team) => team.divisionCode)).toEqual(
      secondRun.teams.map((team) => team.divisionCode),
    );

    const counts = firstRun.divisions.map((division) => division.teamCount ?? 0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("rejects entries that violate the 2-per-division rule", () => {
    const pool = buildProvisionalTeamPool(createTeams(24));
    const validSelection = pool.divisions.flatMap((division) => {
      return pool.teams
        .filter((team) => team.divisionCode === division.code)
        .slice(0, 2)
        .map((team) => team.teamNumber);
    });

    expect(validateEntrySelection(validSelection, pool.teams)).toBeNull();

    const invalidSelection = [...validSelection.slice(0, -1), validSelection[0]];
    expect(validateEntrySelection(invalidSelection, pool.teams)).toBeTruthy();
  });

  it("rejects official-remap teams that are no longer draftable", () => {
    const pool = buildProvisionalTeamPool(createTeams(24));
    const selection = pool.divisions.flatMap((division) => {
      return pool.teams
        .filter((team) => team.divisionCode === division.code)
        .slice(0, 2)
        .map((team) => team.teamNumber);
    });

    expect(validateEntrySelection([...selection.slice(0, -1), 99999], pool.teams)).toMatch(
      /no longer in the official Worlds draft pool/,
    );
  });
});
