import { describe, expect, it } from "vitest";

import { scoreDivision, sortLeaderboard } from "@/lib/fantasy/scoring";

describe("scoreDivision", () => {
  it("awards qualification, playoff, finalist, and champion bonuses", () => {
    const scoreMap = scoreDivision(
      [
        { matchesPlayed: 6, rank: 1, teamNumber: 1, ties: 0, wins: 5 },
        { matchesPlayed: 6, rank: 2, teamNumber: 2, ties: 1, wins: 4 },
        { matchesPlayed: 6, rank: 3, teamNumber: 3, ties: 0, wins: 4 },
        { matchesPlayed: 6, rank: 4, teamNumber: 4, ties: 0, wins: 3 },
      ],
      [
        {
          matchNumber: 1,
          scoreBlueFinal: 90,
          scoreRedFinal: 110,
          series: 1,
          teams: [
            { station: "Red1", teamNumber: 1 },
            { station: "Red2", teamNumber: 2 },
            { station: "Blue1", teamNumber: 3 },
            { station: "Blue2", teamNumber: 4 },
          ],
          tournamentLevel: "Playoff",
        },
      ],
    );

    const championBreakdown = scoreMap.get(1) ?? [];
    const finalistBreakdown = scoreMap.get(3) ?? [];

    expect(championBreakdown.reduce((sum, item) => sum + item.points, 0)).toBe(35);
    expect(finalistBreakdown.reduce((sum, item) => sum + item.points, 0)).toBe(19);
  });
});

describe("sortLeaderboard", () => {
  it("uses champion hit, then highest single team, then save time as tiebreaks", () => {
    const rows = sortLeaderboard([
      {
        championHit: false,
        entryId: "a",
        entryName: "Alpha",
        highestSingleTeamScore: 20,
        isValid: true,
        savedAt: "2026-03-17T12:00:00.000Z",
        teamScores: [],
        totalPoints: 100,
        userId: "1",
        userLabel: "Alpha",
      },
      {
        championHit: true,
        entryId: "b",
        entryName: "Bravo",
        highestSingleTeamScore: 12,
        isValid: true,
        savedAt: "2026-03-17T12:30:00.000Z",
        teamScores: [],
        totalPoints: 100,
        userId: "2",
        userLabel: "Bravo",
      },
    ]);

    expect(rows[0]?.entryId).toBe("b");
  });
});
