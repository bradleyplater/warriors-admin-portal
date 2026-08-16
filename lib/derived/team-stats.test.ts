import { describe, expect, it } from "vitest";
import { deriveTeamSeasonStats } from "./team-stats";
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

describe("deriveTeamSeasonStats", () => {
  it("returns all zeros when no games have recorded goals or penalties", () => {
    expect(deriveTeamSeasonStats([game()], "SSN2526")).toEqual({
      gamesPlayed: 1,
      goals: 0,
      assists: 0,
      pims: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      wins: 0,
      draws: 1,
      losses: 0,
    });
  });

  it("returns gamesPlayed 0 for a season with no recorded games, alongside zero for every other stat", () => {
    const games = [game({ _id: "GME000001", seasonId: "SSN2425" })];

    expect(deriveTeamSeasonStats(games, "SSN2526")).toEqual({
      gamesPlayed: 0,
      goals: 0,
      assists: 0,
      pims: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    });
  });

  it("sums goals, assists, and PIMs across every game in the season", () => {
    const games = [
      game({
        _id: "GME000001",
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
          goals: [
            {
              _id: "GOL1",
              scoredBy: "PLR1",
              assist1: "PLR2",
              minute: 5,
              second: 0,
              type: "EVEN",
            },
          ],
          penalties: [
            { _id: "PEN1", offender: "PLR1", minute: 2, second: 0, type: "TRIP", duration: 2 },
          ],
        },
      }),
      game({
        _id: "GME000002",
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [
            { _id: "GOL2", scoredBy: "PLR1", minute: 1, second: 0, type: "PP" },
          ],
          penalties: [],
        },
      }),
    ];

    expect(deriveTeamSeasonStats(games, "SSN2526")).toEqual({
      gamesPlayed: 2,
      goals: 2,
      assists: 1,
      pims: 2,
      goalsFor: 2,
      goalsAgainst: 0,
      wins: 2,
      draws: 0,
      losses: 0,
    });
  });

  it("counts bench penalty durations toward the team total", () => {
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [],
          penalties: [
            { _id: "PEN1", offender: "BENCH", minute: 10, second: 0, type: "TOOM", duration: 2 },
          ],
        },
      }),
    ];

    expect(deriveTeamSeasonStats(games, "SSN2526").pims).toBe(2);
  });

  it("counts up to two assists per goal", () => {
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }, { playerId: "PLR3" }],
          goals: [
            {
              _id: "GOL1",
              scoredBy: "PLR1",
              assist1: "PLR2",
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

    expect(deriveTeamSeasonStats(games, "SSN2526").assists).toBe(2);
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

    const stats = deriveTeamSeasonStats(games, "SSN2526");
    expect(stats.goals).toBe(0);
    expect(stats.gamesPlayed).toBe(1);
  });

  it("counts a game with more opponent goals as a loss", () => {
    const games = [
      game({
        opponentTeam: {
          name: "Opponents",
          goals: [{ _id: "OGL1", scoredBy: "Rival", minute: 1, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    ];

    const stats = deriveTeamSeasonStats(games, "SSN2526");
    expect(stats.goalsFor).toBe(0);
    expect(stats.goalsAgainst).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.losses).toBe(1);
  });

  it("counts an equal-goals game with no shootout as a draw", () => {
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [{ _id: "GOL1", scoredBy: "PLR1", minute: 1, second: 0, type: "EVEN" }],
          penalties: [],
        },
        opponentTeam: {
          name: "Opponents",
          goals: [{ _id: "OGL1", scoredBy: "Rival", minute: 1, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    ];

    expect(deriveTeamSeasonStats(games, "SSN2526").draws).toBe(1);
  });

  it("counts a shootout win as a win, not a draw", () => {
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [
            { _id: "GOL1", scoredBy: "PLR1", minute: 1, second: 0, type: "EVEN" },
            { _id: "GOL2", scoredBy: "PLR1", minute: 0, second: 0, type: "SO" },
          ],
          penalties: [],
        },
        opponentTeam: {
          name: "Opponents",
          goals: [{ _id: "OGL1", scoredBy: "Rival", minute: 1, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    ];

    const stats = deriveTeamSeasonStats(games, "SSN2526");
    expect(stats.wins).toBe(1);
    expect(stats.draws).toBe(0);
    expect(stats.goalsFor).toBe(2);
  });
});
