import { describe, expect, it } from "vitest";

import {
  getQualificationLockTimestamp,
  isStartedQualificationMatch,
} from "@/lib/ftc/match-state";

describe("isStartedQualificationMatch", () => {
  it("only treats started qualification matches as a lock trigger", () => {
    expect(
      isStartedQualificationMatch({
        actualStartTime: "2026-04-15T14:00:00.000Z",
        matchNumber: 1,
        scoreBlueFinal: 0,
        scoreRedFinal: 0,
        series: 1,
        tournamentLevel: "Qualification",
      }),
    ).toBe(true);

    expect(
      isStartedQualificationMatch({
        matchNumber: 2,
        scoreBlueFinal: 0,
        scoreRedFinal: 0,
        series: 1,
        tournamentLevel: "Qual",
      }),
    ).toBe(false);

    expect(
      isStartedQualificationMatch({
        actualStartTime: "2026-04-15T14:00:00.000Z",
        matchNumber: 3,
        scoreBlueFinal: 120,
        scoreRedFinal: 110,
        series: 1,
        tournamentLevel: "Playoff",
      }),
    ).toBe(false);
  });
});

describe("getQualificationLockTimestamp", () => {
  it("returns the earliest started qualification match", () => {
    expect(
      getQualificationLockTimestamp([
        {
          actualStartTime: "2026-04-15T14:05:00.000Z",
          matchNumber: 2,
          scoreBlueFinal: 0,
          scoreRedFinal: 0,
          series: 1,
          tournamentLevel: "Qual",
        },
        {
          actualStartTime: "2026-04-15T14:02:00.000Z",
          matchNumber: 1,
          scoreBlueFinal: 0,
          scoreRedFinal: 0,
          series: 1,
          tournamentLevel: "Qual",
        },
        {
          matchNumber: 3,
          scoreBlueFinal: 0,
          scoreRedFinal: 0,
          series: 1,
          tournamentLevel: "Qual",
        },
      ]),
    ).toBe("2026-04-15T14:02:00.000Z");
  });
});
