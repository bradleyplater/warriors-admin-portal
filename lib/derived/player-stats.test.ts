import { describe, expect, it } from "vitest";
import { derivePlayerSeasonStats } from "./player-stats";
import type { Game } from "../schemas";

function game(overrides: Partial<Game> = {}): Game {
  return {
    _id: "GME000001",
    date: new Date("2026-01-15"),
    seasonId: "SSN2526",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
      goals: [],
      penalties: [],
    },
    opponentTeam: { name: "Opponents", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("derivePlayerSeasonStats", () => {
  it("returns all zeros when the player has no goals, assists, penalties, or awards", () => {
    const games = [game()];
    expect(derivePlayerSeasonStats(games, "PLR1", "SSN2526")).toEqual({
      goals: 0,
      assists: 0,
      points: 0,
      pims: 0,
      manOfTheMatch: 0,
      warriorOfTheGame: 0,
    });
  });

  it("sums goals and assists across multiple games in the season", () => {
    const games = [
      game({
        _id: "GME000001",
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
          goals: [
            { _id: "GOL1", scoredBy: "PLR1", minute: 5, second: 0, type: "EVEN" },
            {
              _id: "GOL2",
              scoredBy: "PLR2",
              assist1: "PLR1",
              minute: 10,
              second: 0,
              type: "EVEN",
            },
          ],
          penalties: [],
        },
      }),
      game({
        _id: "GME000002",
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
          goals: [
            { _id: "GOL3", scoredBy: "PLR1", minute: 1, second: 0, type: "PP" },
          ],
          penalties: [],
        },
      }),
    ];

    const stats = derivePlayerSeasonStats(games, "PLR1", "SSN2526");
    expect(stats.goals).toBe(2);
    expect(stats.assists).toBe(1);
    expect(stats.points).toBe(3);
  });

  it("computes points as goals plus assists", () => {
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }, { playerId: "PLR3" }],
          goals: [
            {
              _id: "GOL1",
              scoredBy: "PLR2",
              assist1: "PLR1",
              assist2: "PLR3",
              minute: 5,
              second: 0,
              type: "EVEN",
            },
          ],
          penalties: [],
        },
      }),
    ];

    expect(derivePlayerSeasonStats(games, "PLR1", "SSN2526").points).toBe(1);
  });

  it("sums the player's own penalty durations into PIMs, excluding bench penalties", () => {
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [],
          penalties: [
            { _id: "PEN1", offender: "PLR1", minute: 2, second: 0, type: "TRIP", duration: 2 },
            { _id: "PEN2", offender: "BENCH", minute: 10, second: 0, type: "TOOM", duration: 2 },
          ],
        },
      }),
    ];

    expect(derivePlayerSeasonStats(games, "PLR1", "SSN2526").pims).toBe(2);
  });

  it("counts Man of the Match and Warrior of the Game awards across the season", () => {
    const games = [
      game({ _id: "GME000001", manOfTheMatchPlayerId: "PLR1" }),
      game({ _id: "GME000002", warriorOfTheGamePlayerId: "PLR1" }),
      game({ _id: "GME000003", manOfTheMatchPlayerId: "PLR1" }),
    ];

    const stats = derivePlayerSeasonStats(games, "PLR1", "SSN2526");
    expect(stats.manOfTheMatch).toBe(2);
    expect(stats.warriorOfTheGame).toBe(1);
  });

  it("only counts games within the requested season", () => {
    const games = [
      game({
        _id: "GME000001",
        seasonId: "SSN2425",
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [{ _id: "GOL1", scoredBy: "PLR1", minute: 1, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
      game({ _id: "GME000002", seasonId: "SSN2526" }),
    ];

    expect(derivePlayerSeasonStats(games, "PLR1", "SSN2526").goals).toBe(0);
  });

  it("moves a goal's stat from the original scorer to the new scorer when the goal is edited", () => {
    const before = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
          goals: [{ _id: "GOL1", scoredBy: "PLR1", minute: 5, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    ];
    const after = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
          goals: [{ _id: "GOL1", scoredBy: "PLR2", minute: 5, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    ];

    expect(derivePlayerSeasonStats(before, "PLR1", "SSN2526").goals).toBe(1);
    expect(derivePlayerSeasonStats(before, "PLR2", "SSN2526").goals).toBe(0);
    expect(derivePlayerSeasonStats(after, "PLR1", "SSN2526").goals).toBe(0);
    expect(derivePlayerSeasonStats(after, "PLR2", "SSN2526").goals).toBe(1);
  });
});
