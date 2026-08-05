import { describe, expect, it } from "vitest";
import { deriveTeamSeasonStats } from "./team-stats";
import { games } from "../../seed/data/games";

// Sanity check against the documented "Actual computed totals from the
// seeded games" comment in seed/data/team.ts (legacyStats) — an independent
// oracle for the derivation formulas, not just a self-referential test.
// gamesPlayed is hand-counted directly from seed/data/games.ts (number of
// entries per seasonId), not from legacyStats, which has no gamesPlayed
// field: SSN2223: 2, SSN2324: 2, SSN2425: 3, SSN2526: 3.
describe("deriveTeamSeasonStats against seeded games (sanity check)", () => {
  it.each([
    ["SSN2223", { gamesPlayed: 2, goals: 3, assists: 3, pims: 4 }],
    ["SSN2324", { gamesPlayed: 2, goals: 2, assists: 1, pims: 6 }],
    ["SSN2425", { gamesPlayed: 3, goals: 5, assists: 3, pims: 4 }],
    ["SSN2526", { gamesPlayed: 3, goals: 5, assists: 5, pims: 8 }],
  ])("%s matches the documented totals", (seasonId, expected) => {
    expect(deriveTeamSeasonStats(games, seasonId)).toEqual(expected);
  });
});
