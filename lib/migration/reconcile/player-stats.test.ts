import { describe, expect, it } from "vitest";
import type { Game } from "../../schemas";
import {
  comparePlayerStatsMismatches,
  type RawPlayerDoc,
  type RawTeamPlayerEntry,
} from "./player-stats";

function game(overrides: Partial<Game> = {}): Game {
  return {
    _id: "GME000001",
    date: new Date("2026-01-15"),
    seasonId: "SSN2425",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR562272" }],
      goals: [],
      penalties: [],
    },
    opponentTeam: { name: "Opponents", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// 10 rostered games in SSN2425 — matches the migration plan's known
// discrepancy: recomputed gamesPlayed is 10.
const tenGamesInSeason: Game[] = Array.from({ length: 10 }, (_, index) =>
  game({ _id: `GME00000${index}` }),
);

describe("comparePlayerStatsMismatches", () => {
  it("reproduces the known PLR562272 drift: Player.stats agrees, Team.players[].stats does not", () => {
    const players: RawPlayerDoc[] = [
      {
        _id: "PLR562272",
        stats: [{ seasonId: "SSN2425", gamesPlayed: 10, goals: 0, assists: 0, pims: 0 }],
      },
    ];
    const teamPlayers: RawTeamPlayerEntry[] = [
      {
        playerId: "PLR562272",
        stats: [{ seasonId: "SSN2425", gamesPlayed: 9, goals: 0, assists: 0, pims: 0 }],
      },
    ];

    const mismatches = comparePlayerStatsMismatches(
      players,
      teamPlayers,
      tenGamesInSeason,
      ["SSN2425"],
    );

    expect(mismatches).toEqual([
      {
        key: "player-stats:PLR562272:SSN2425:gamesPlayed:teamCopy",
        dimension: "player-stats",
        entityId: "PLR562272",
        seasonId: "SSN2425",
        field: "gamesPlayed",
        source: "teamCopy",
        storedValue: 9,
        computedValue: 10,
      },
    ]);
  });

  it("treats a missing manOfTheMatch/warriorOfTheGame field as 0 rather than a mismatch, when computed is also 0", () => {
    const players: RawPlayerDoc[] = [
      {
        _id: "PLR1",
        stats: [{ seasonId: "SSN2425", gamesPlayed: 1, goals: 0, assists: 0, pims: 0 }],
      },
    ];
    const teamPlayers: RawTeamPlayerEntry[] = [
      {
        playerId: "PLR1",
        stats: [{ seasonId: "SSN2425", gamesPlayed: 1, goals: 0, assists: 0, pims: 0 }],
      },
    ];

    const mismatches = comparePlayerStatsMismatches(
      players,
      teamPlayers,
      [game({ team: { id: "TM551420", roster: [{ playerId: "PLR1" }], goals: [], penalties: [] } })],
      ["SSN2425"],
    );

    expect(mismatches).toEqual([]);
  });

  it("surfaces a missing stored season entry against a nonzero computed value", () => {
    const players: RawPlayerDoc[] = [{ _id: "PLR1", stats: [] }];
    const teamPlayers: RawTeamPlayerEntry[] = [{ playerId: "PLR1", stats: [] }];
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [{ _id: "GOL1", scoredBy: "PLR1", minute: 5, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    ];

    const mismatches = comparePlayerStatsMismatches(players, teamPlayers, games, [
      "SSN2425",
    ]);

    const goalsMismatches = mismatches.filter((m) => m.field === "goals");
    expect(goalsMismatches).toEqual([
      {
        key: "player-stats:PLR1:SSN2425:goals:player",
        dimension: "player-stats",
        entityId: "PLR1",
        seasonId: "SSN2425",
        field: "goals",
        source: "player",
        storedValue: 0,
        computedValue: 1,
      },
      {
        key: "player-stats:PLR1:SSN2425:goals:teamCopy",
        dimension: "player-stats",
        entityId: "PLR1",
        seasonId: "SSN2425",
        field: "goals",
        source: "teamCopy",
        storedValue: 0,
        computedValue: 1,
      },
    ]);
  });

  it("reports no mismatches when both stored copies already agree with the recompute", () => {
    const players: RawPlayerDoc[] = [
      {
        _id: "PLR1",
        stats: [
          {
            seasonId: "SSN2425",
            gamesPlayed: 1,
            goals: 1,
            assists: 0,
            pims: 0,
            manOfTheMatch: 0,
            warriorOfTheGame: 0,
          },
        ],
      },
    ];
    const teamPlayers: RawTeamPlayerEntry[] = [
      {
        playerId: "PLR1",
        stats: [
          {
            seasonId: "SSN2425",
            gamesPlayed: 1,
            goals: 1,
            assists: 0,
            pims: 0,
            manOfTheMatch: 0,
            warriorOfTheGame: 0,
          },
        ],
      },
    ];
    const games = [
      game({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLR1" }],
          goals: [{ _id: "GOL1", scoredBy: "PLR1", minute: 5, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    ];

    expect(
      comparePlayerStatsMismatches(players, teamPlayers, games, ["SSN2425"]),
    ).toEqual([]);
  });
});
