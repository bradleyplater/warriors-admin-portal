import { describe, expect, it } from "vitest";
import type { Game } from "../../schemas";
import {
  compareTeamStatsMismatches,
  type RawTeamStatsEntry,
} from "./team-stats";

function game(overrides: Partial<Game> = {}): Game {
  return {
    _id: "GME000001",
    date: new Date("2026-01-15"),
    seasonId: "SSN2223",
    type: "CHALLENGE",
    location: "HOME",
    team: { id: "TM551420", roster: [], goals: [], penalties: [] },
    opponentTeam: { name: "Opponents", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function gamesForSeason(seasonId: string, count: number): Game[] {
  return Array.from({ length: count }, (_, index) =>
    game({ _id: `GME${seasonId}${String(index).padStart(3, "0")}`, seasonId }),
  );
}

// docs/04-migration-plan.md's known discrepancies table.
describe("compareTeamStatsMismatches", () => {
  it("reproduces the three known team games-played drift cases", () => {
    const games = [
      ...gamesForSeason("SSN2223", 17),
      ...gamesForSeason("SSN2324", 24),
      ...gamesForSeason("SSN2425", 25),
    ];
    const storedStats: RawTeamStatsEntry[] = [
      { seasonId: "SSN2223", gamesPlayed: 16, goals: 0, assists: 0, pims: 0 },
      { seasonId: "SSN2324", gamesPlayed: 25, goals: 0, assists: 0, pims: 0 },
      { seasonId: "SSN2425", gamesPlayed: 24, goals: 0, assists: 0, pims: 0 },
    ];

    const mismatches = compareTeamStatsMismatches("TM551420", storedStats, games, [
      "SSN2223",
      "SSN2324",
      "SSN2425",
    ]);

    const gamesPlayedMismatches = mismatches.filter(
      (m) => m.field === "gamesPlayed",
    );
    expect(gamesPlayedMismatches).toEqual([
      {
        key: "team-stats:TM551420:SSN2223:gamesPlayed",
        dimension: "team-stats",
        entityId: "TM551420",
        seasonId: "SSN2223",
        field: "gamesPlayed",
        storedValue: 16,
        computedValue: 17,
      },
      {
        key: "team-stats:TM551420:SSN2324:gamesPlayed",
        dimension: "team-stats",
        entityId: "TM551420",
        seasonId: "SSN2324",
        field: "gamesPlayed",
        storedValue: 25,
        computedValue: 24,
      },
      {
        key: "team-stats:TM551420:SSN2425:gamesPlayed",
        dimension: "team-stats",
        entityId: "TM551420",
        seasonId: "SSN2425",
        field: "gamesPlayed",
        storedValue: 24,
        computedValue: 25,
      },
    ]);
  });

  it("treats a missing stored season as 0, surfacing a mismatch only when computed is nonzero", () => {
    const games = gamesForSeason("SSN2223", 2);

    const mismatches = compareTeamStatsMismatches(
      "TM551420",
      undefined,
      games,
      ["SSN2223"],
    );

    expect(mismatches).toContainEqual({
      key: "team-stats:TM551420:SSN2223:gamesPlayed",
      dimension: "team-stats",
      entityId: "TM551420",
      seasonId: "SSN2223",
      field: "gamesPlayed",
      storedValue: 0,
      computedValue: 2,
    });
  });

  it("reports no mismatches when stored already agrees with the recompute", () => {
    const games = gamesForSeason("SSN2223", 2);
    const storedStats: RawTeamStatsEntry[] = [
      { seasonId: "SSN2223", gamesPlayed: 2, goals: 0, assists: 0, pims: 0 },
    ];

    expect(
      compareTeamStatsMismatches("TM551420", storedStats, games, ["SSN2223"]),
    ).toEqual([]);
  });
});
