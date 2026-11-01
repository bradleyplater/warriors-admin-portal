import { describe, expect, it } from "vitest";
import type { Game, GameType, Player } from "../schemas";
import {
  awardStat,
  formatStat,
  gamesForAward,
  statAwardLeader,
  statAwardTotal,
} from "./stat-leaders";

type GoalSpec = [scoredBy: string, assist1?: string];

let nextId = 0;

function game(type: GameType, goals: GoalSpec[], seasonId = "SSN2526"): Game {
  nextId += 1;
  return {
    _id: `GME${nextId}`,
    date: new Date("2026-01-15"),
    seasonId,
    type,
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [
        { playerId: "PLR1" },
        { playerId: "PLR2" },
        { playerId: "COACH" },
      ],
      goals: goals.map(([scoredBy, assist1], index) => ({
        _id: `GOL${nextId}-${index}`,
        scoredBy,
        ...(assist1 && { assist1 }),
        minute: index,
        second: 0,
        type: "EVEN",
      })),
      penalties: [],
    },
    opponentTeam: { opponentId: "OPN000001", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function player(_id: string, excludeFromStatAwards?: boolean): Player {
  return {
    _id,
    firstName: _id,
    surname: _id,
    positions: ["Forward"],
    active: false,
    teamId: "TM551420",
    ...(excludeFromStatAwards && { excludeFromStatAwards }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const players = [player("PLR1"), player("PLR2"), player("COACH", true)];

describe("awardStat", () => {
  it("is the stat behind most goals, assists and points", () => {
    expect(awardStat({ category: "most-points" })).toBe("points");
  });

  it("is undefined for other awards, custom ones included", () => {
    expect(awardStat({ category: "mvp" })).toBeUndefined();
    expect(awardStat({})).toBeUndefined();
  });
});

describe("formatStat", () => {
  it("is singular for one and plural otherwise", () => {
    expect(formatStat(1, "goals")).toBe("1 goal");
    expect(formatStat(0, "assists")).toBe("0 assists");
    expect(formatStat(29, "points")).toBe("29 points");
  });
});

describe("gamesForAward", () => {
  const botb = game("BOTBC", []);
  const llihc = game("LLIHC", []);
  const challenge = game("CHALLENGE", []);
  const lastSeason = game("BOTBC", [], "SSN2425");
  const games = [botb, llihc, challenge, lastSeason];

  it("keeps one competition's games in the season", () => {
    expect(gamesForAward(games, "SSN2526", "BOTBC")).toEqual([botb]);
  });

  it("keeps every game in the season for a club-wide award", () => {
    expect(gamesForAward(games, "SSN2526", undefined)).toEqual([
      botb,
      llihc,
      challenge,
    ]);
  });
});

describe("statAwardLeader", () => {
  it("finds the top scorer in the award's competition only", () => {
    const games = [
      game("BOTBC", [["PLR1"], ["PLR1"]]),
      game("LLIHC", [["PLR2"], ["PLR2"], ["PLR2"]]),
    ];
    expect(
      statAwardLeader(games, players, "SSN2526", "BOTBC", "goals"),
    ).toEqual({ playerIds: ["PLR1"], value: 2 });
    expect(
      statAwardLeader(games, players, "SSN2526", "LLIHC", "goals"),
    ).toEqual({ playerIds: ["PLR2"], value: 3 });
  });

  it("leaves out a player flagged as excluded, even when they lead", () => {
    const games = [game("BOTBC", [["COACH"], ["COACH"], ["COACH"], ["PLR1"]])];
    expect(
      statAwardLeader(games, players, "SSN2526", "BOTBC", "goals"),
    ).toEqual({ playerIds: ["PLR1"], value: 1 });
  });

  it("returns every player on a tie", () => {
    const games = [game("BOTBC", [["PLR1"], ["PLR2"]])];
    expect(
      statAwardLeader(games, players, "SSN2526", "BOTBC", "goals")?.playerIds,
    ).toEqual(["PLR1", "PLR2"]);
  });

  it("counts assists and points", () => {
    const games = [
      game("BOTBC", [["PLR1", "PLR2"], ["PLR1", "PLR2"], ["PLR2"]]),
    ];
    expect(
      statAwardLeader(games, players, "SSN2526", "BOTBC", "assists"),
    ).toEqual({ playerIds: ["PLR2"], value: 2 });
    expect(
      statAwardLeader(games, players, "SSN2526", "BOTBC", "points"),
    ).toEqual({ playerIds: ["PLR2"], value: 3 });
  });

  it("returns null when nobody has scored", () => {
    expect(
      statAwardLeader(
        [game("BOTBC", [])],
        players,
        "SSN2526",
        "BOTBC",
        "goals",
      ),
    ).toBeNull();
  });
});

describe("statAwardTotal", () => {
  it("totals the stat in the award's games, flagged players included", () => {
    const games = [
      game("BOTBC", [["COACH"], ["COACH"]]),
      game("LLIHC", [["COACH"]]),
    ];
    expect(statAwardTotal(games, "SSN2526", "BOTBC", "goals", "COACH")).toBe(2);
    expect(statAwardTotal(games, "SSN2526", undefined, "goals", "COACH")).toBe(
      3,
    );
  });
});
