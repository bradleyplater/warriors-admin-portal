import { describe, expect, it } from "vitest";
import {
  computePlayedCurrentSeasonPlayerIds,
  selectCurrentSeasonId,
  sortActiveReviewPlayers,
  type ActiveReviewPlayer,
} from "./list";
import type { Game, Season } from "../../schemas";

function season(id: string): Season {
  const name = `${id.slice(3, 5)}/${id.slice(5, 7)}`;
  return { _id: id, name, createdAt: new Date(), updatedAt: new Date() };
}

function game(overrides: Partial<Game> & { seasonId: string; roster: string[] }): Game {
  const { roster, ...rest } = overrides;
  return {
    _id: "GME000001",
    date: new Date(),
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM000001",
      roster: roster.map((playerId) => ({ playerId })),
      goals: [],
      penalties: [],
    },
    opponentTeam: { name: "Opponent", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  };
}

function player(overrides: Partial<ActiveReviewPlayer> & { playerId: string }): ActiveReviewPlayer {
  return {
    firstName: "First",
    surname: "Last",
    number: null,
    active: undefined,
    playedCurrentSeason: false,
    ...overrides,
  };
}

describe("selectCurrentSeasonId", () => {
  it("returns null when there are no seasons", () => {
    expect(selectCurrentSeasonId([])).toBeNull();
  });

  it("picks the lexicographically-highest season id", () => {
    const seasons = [season("SSN2324"), season("SSN2526"), season("SSN2425")];
    expect(selectCurrentSeasonId(seasons)).toBe("SSN2526");
  });

  it("is stable when there is only one season", () => {
    expect(selectCurrentSeasonId([season("SSN2223")])).toBe("SSN2223");
  });
});

describe("computePlayedCurrentSeasonPlayerIds", () => {
  it("returns an empty set when there is no current season", () => {
    const games = [game({ seasonId: "SSN2526", roster: ["PLR000001"] })];
    expect(computePlayedCurrentSeasonPlayerIds(games, null)).toEqual(new Set());
  });

  it("collects roster player ids only from games in the current season", () => {
    const games = [
      game({ _id: "GME1", seasonId: "SSN2526", roster: ["PLR1", "PLR2"] }),
      game({ _id: "GME2", seasonId: "SSN2425", roster: ["PLR3"] }),
      game({ _id: "GME3", seasonId: "SSN2526", roster: ["PLR2", "PLR4"] }),
    ];
    expect(computePlayedCurrentSeasonPlayerIds(games, "SSN2526")).toEqual(
      new Set(["PLR1", "PLR2", "PLR4"]),
    );
  });
});

describe("sortActiveReviewPlayers", () => {
  it("puts players who played the current season first", () => {
    const players = [
      player({ playerId: "A", playedCurrentSeason: false, number: 1 }),
      player({ playerId: "B", playedCurrentSeason: true, number: 2 }),
    ];
    expect(sortActiveReviewPlayers(players).map((p) => p.playerId)).toEqual([
      "B",
      "A",
    ]);
  });

  it("breaks ties by shirt number, missing numbers last", () => {
    const players = [
      player({ playerId: "A", number: null }),
      player({ playerId: "B", number: 5 }),
      player({ playerId: "C", number: 2 }),
    ];
    expect(sortActiveReviewPlayers(players).map((p) => p.playerId)).toEqual([
      "C",
      "B",
      "A",
    ]);
  });

  it("breaks remaining ties by surname", () => {
    const players = [
      player({ playerId: "A", surname: "Zeta", number: null }),
      player({ playerId: "B", surname: "Alpha", number: null }),
    ];
    expect(sortActiveReviewPlayers(players).map((p) => p.playerId)).toEqual([
      "B",
      "A",
    ]);
  });
});
