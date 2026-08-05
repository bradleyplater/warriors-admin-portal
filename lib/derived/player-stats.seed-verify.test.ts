import { describe, expect, it } from "vitest";
import { derivePlayerSeasonStats } from "./player-stats";
import { games } from "../../seed/data/games";

// Sanity check against hand-counted totals from seed/data/games.ts — an
// independent oracle for the derivation formulas, not just a self-referential
// test. Every seeded game uses the same fixed roster, so any rostered
// player's gamesPlayed per season equals that season's game count
// (SSN2223: 2, SSN2324: 2, SSN2425: 3, SSN2526: 3). Values hand-counted
// directly from the goal/penalty/award entries in seed/data/games.ts:
//
// PLR100001 (Jamie Ashworth): SSN2223 {gamesPlayed:2,goals:1,assists:0,
// points:1,pims:0,manOfTheMatch:0,warriorOfTheGame:0} (scores in GME100001);
// SSN2324 {gamesPlayed:2,goals:0,assists:0,points:0,pims:0,manOfTheMatch:0,
// warriorOfTheGame:0} (uninvolved); SSN2425 {gamesPlayed:3,goals:1,assists:0,
// points:1,pims:0,manOfTheMatch:0,warriorOfTheGame:0} (scores in GME100006);
// SSN2526 {gamesPlayed:3,goals:0,assists:1,points:1,pims:0,manOfTheMatch:0,
// warriorOfTheGame:0} (assists in GME100008).
//
// PLR100014 (Chris Norbury): SSN2223 {gamesPlayed:2,goals:0,assists:1,
// points:1,pims:0,manOfTheMatch:0,warriorOfTheGame:1} (assists and Warrior
// of the Game in GME100001); SSN2324 {gamesPlayed:2,goals:1,assists:0,
// points:1,pims:0,manOfTheMatch:0,warriorOfTheGame:0} (scores in GME100004);
// SSN2425 {gamesPlayed:3,goals:1,assists:0,points:1,pims:0,manOfTheMatch:0,
// warriorOfTheGame:0} (scores in GME100006); SSN2526 {gamesPlayed:3,goals:0,
// assists:1,points:1,pims:0,manOfTheMatch:0,warriorOfTheGame:0} (assists in
// GME100009).
//
// PLR100005 (Sam Elliston) is never in the seeded roster — zero, including
// gamesPlayed, in every season.
describe("derivePlayerSeasonStats against seeded games (sanity check)", () => {
  it.each([
    ["SSN2223", "PLR100001", { gamesPlayed: 2, goals: 1, assists: 0, points: 1, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2324", "PLR100001", { gamesPlayed: 2, goals: 0, assists: 0, points: 0, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2425", "PLR100001", { gamesPlayed: 3, goals: 1, assists: 0, points: 1, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2526", "PLR100001", { gamesPlayed: 3, goals: 0, assists: 1, points: 1, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2223", "PLR100014", { gamesPlayed: 2, goals: 0, assists: 1, points: 1, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 1 }],
    ["SSN2324", "PLR100014", { gamesPlayed: 2, goals: 1, assists: 0, points: 1, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2425", "PLR100014", { gamesPlayed: 3, goals: 1, assists: 0, points: 1, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2526", "PLR100014", { gamesPlayed: 3, goals: 0, assists: 1, points: 1, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2223", "PLR100005", { gamesPlayed: 0, goals: 0, assists: 0, points: 0, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2324", "PLR100005", { gamesPlayed: 0, goals: 0, assists: 0, points: 0, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2425", "PLR100005", { gamesPlayed: 0, goals: 0, assists: 0, points: 0, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
    ["SSN2526", "PLR100005", { gamesPlayed: 0, goals: 0, assists: 0, points: 0, pims: 0, manOfTheMatch: 0, warriorOfTheGame: 0 }],
  ])("%s %s matches the hand-counted totals", (seasonId, playerId, expected) => {
    expect(derivePlayerSeasonStats(games, playerId, seasonId)).toEqual(expected);
  });
});
