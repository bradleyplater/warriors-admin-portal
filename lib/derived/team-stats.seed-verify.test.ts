import { describe, expect, it } from "vitest";
import { deriveTeamSeasonStats } from "./team-stats";
import { games } from "../../seed/data/games";

// Sanity check against totals hand-computed from seed/data/games.ts — an
// independent oracle for the derivation formulas, not just a
// self-referential test. goals/assists/pims per season: SSN2223 {3,3,4},
// SSN2324 {2,1,6}, SSN2425 {5,3,4}, SSN2526 {5,5,8}. gamesPlayed is the
// number of seeded games per seasonId: SSN2223: 2, SSN2324: 2, SSN2425: 3,
// SSN2526: 3. goalsFor/goalsAgainst/wins/draws/losses come from running
// deriveScore over each seeded game's goals.
describe("deriveTeamSeasonStats against seeded games (sanity check)", () => {
  it.each([
    [
      "SSN2223",
      {
        gamesPlayed: 2,
        goals: 3,
        assists: 3,
        pims: 4,
        goalsFor: 3,
        goalsAgainst: 3,
        wins: 1,
        draws: 0,
        losses: 1,
      },
    ],
    [
      "SSN2324",
      {
        gamesPlayed: 2,
        goals: 2,
        assists: 1,
        pims: 6,
        goalsFor: 2,
        goalsAgainst: 1,
        wins: 1,
        draws: 1,
        losses: 0,
      },
    ],
    [
      "SSN2425",
      {
        gamesPlayed: 3,
        goals: 5,
        assists: 3,
        pims: 4,
        goalsFor: 5,
        goalsAgainst: 2,
        wins: 3,
        draws: 0,
        losses: 0,
      },
    ],
    [
      "SSN2526",
      {
        gamesPlayed: 3,
        goals: 5,
        assists: 5,
        pims: 8,
        goalsFor: 5,
        goalsAgainst: 2,
        wins: 2,
        draws: 1,
        losses: 0,
      },
    ],
  ])("%s matches the documented totals", (seasonId, expected) => {
    expect(deriveTeamSeasonStats(games, seasonId)).toEqual(expected);
  });
});
