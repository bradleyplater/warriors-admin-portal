import { describe, expect, it } from "vitest";
import { compareGameScoreMismatches, type RawGameDoc } from "./game-score";

describe("compareGameScoreMismatches", () => {
  it("reports no mismatches when the stored score already matches the recompute, including periods", () => {
    const game: RawGameDoc = {
      _id: "GME000001",
      team: {
        goals: [
          { type: "EVEN", minute: 5 }, // P1
          { type: "PP", minute: 25 }, // P2
        ],
      },
      opponentTeam: { goals: [{ type: "EVEN", minute: 45 }] }, // P3
      score: {
        team: 2,
        opponent: 1,
        periods: [
          { number: 1, team: 1, opponent: 0 },
          { number: 2, team: 1, opponent: 0 },
          { number: 3, team: 0, opponent: 1 },
        ],
      },
    };

    expect(compareGameScoreMismatches([game])).toEqual([]);
  });

  it("surfaces a total mismatch when the stored score disagrees with the recompute", () => {
    const game: RawGameDoc = {
      _id: "GME000001",
      team: { goals: [{ type: "EVEN", minute: 5 }] },
      opponentTeam: { goals: [] },
      score: {
        team: 5,
        opponent: 0,
        periods: [
          { number: 1, team: 1, opponent: 0 },
          { number: 2, team: 0, opponent: 0 },
          { number: 3, team: 0, opponent: 0 },
        ],
      },
    };

    const mismatches = compareGameScoreMismatches([game]);
    expect(mismatches).toEqual([
      {
        key: "game-score:GME000001:score.team",
        dimension: "game-score",
        entityId: "GME000001",
        field: "score.team",
        storedValue: 5,
        computedValue: 1,
      },
    ]);
  });

  it("validates the shootout winner's +1 against the stored total", () => {
    const game: RawGameDoc = {
      _id: "GME000005",
      team: {
        goals: [
          { type: "EVEN", minute: 8 }, // P1 regulation goal
          { type: "SO", minute: 0 }, // shootout goal, excluded from periods
        ],
      },
      opponentTeam: { goals: [{ type: "EVEN", minute: 50 }] }, // P3
      score: {
        // Team wins the shootout 1-0, so team total = 1 regulation + 1 = 2.
        team: 2,
        opponent: 1,
        periods: [
          { number: 1, team: 1, opponent: 0 },
          { number: 2, team: 0, opponent: 0 },
          { number: 3, team: 0, opponent: 1 },
        ],
      },
    };

    expect(compareGameScoreMismatches([game])).toEqual([]);
  });

  it("surfaces a shootout mismatch when the stored total omits the shootout winner's +1", () => {
    const game: RawGameDoc = {
      _id: "GME000005",
      team: {
        goals: [{ type: "SO", minute: 0 }],
      },
      opponentTeam: { goals: [] },
      score: {
        // Missing the shootout +1 — stored as a 0-0 draw instead of a 1-0 win.
        team: 0,
        opponent: 0,
        periods: [
          { number: 1, team: 0, opponent: 0 },
          { number: 2, team: 0, opponent: 0 },
          { number: 3, team: 0, opponent: 0 },
        ],
      },
    };

    const mismatches = compareGameScoreMismatches([game]);
    expect(mismatches).toEqual([
      {
        key: "game-score:GME000005:score.team",
        dimension: "game-score",
        entityId: "GME000005",
        field: "score.team",
        storedValue: 0,
        computedValue: 1,
      },
    ]);
  });

  it("surfaces a period-boundary mismatch at the 19:59 vs 20:00 line", () => {
    const game: RawGameDoc = {
      _id: "GME000010",
      team: { goals: [{ type: "EVEN", minute: 20 }] }, // P2, not P1
      opponentTeam: { goals: [] },
      score: {
        team: 1,
        opponent: 0,
        // Stored (wrongly) as a P1 goal.
        periods: [
          { number: 1, team: 1, opponent: 0 },
          { number: 2, team: 0, opponent: 0 },
          { number: 3, team: 0, opponent: 0 },
        ],
      },
    };

    const mismatches = compareGameScoreMismatches([game]);
    expect(mismatches).toEqual([
      {
        key: "game-score:GME000010:score.period1.team",
        dimension: "game-score",
        entityId: "GME000010",
        field: "score.period1.team",
        storedValue: 1,
        computedValue: 0,
      },
      {
        key: "game-score:GME000010:score.period2.team",
        dimension: "game-score",
        entityId: "GME000010",
        field: "score.period2.team",
        storedValue: 0,
        computedValue: 1,
      },
    ]);
  });

  it("skips a game with no stored score field at all", () => {
    const game: RawGameDoc = {
      _id: "GME000001",
      team: { goals: [{ type: "EVEN", minute: 5 }] },
      opponentTeam: { goals: [] },
    };

    expect(compareGameScoreMismatches([game])).toEqual([]);
  });
});
