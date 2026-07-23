import { describe, expect, it } from "vitest";
import { deriveTeamSeasonStats } from "./team-stats";
import { games } from "../../seed/data/games";

// Sanity check against the documented "Actual computed totals from the
// seeded games" comment in seed/data/team.ts (legacyStats) — an independent
// oracle for the derivation formulas, not just a self-referential test.
describe("deriveTeamSeasonStats against seeded games (sanity check)", () => {
  it.each([
    ["SSN2223", { goals: 3, assists: 3, pims: 4 }],
    ["SSN2324", { goals: 2, assists: 1, pims: 6 }],
    ["SSN2425", { goals: 5, assists: 3, pims: 4 }],
    ["SSN2526", { goals: 5, assists: 5, pims: 8 }],
  ])("%s matches the documented totals", (seasonId, expected) => {
    expect(deriveTeamSeasonStats(games, seasonId)).toEqual(expected);
  });
});
