import { describe, expect, it } from "vitest";
import type { AwardEntry, Game, Player } from "@/lib/schemas";
import { describeAwardWinners } from "./winners";

function player(
  _id: string,
  surname: string,
  number: number,
  excludeFromStatAwards?: boolean,
): Player {
  return {
    _id,
    firstName: "Sam",
    surname,
    number,
    positions: ["Forward"],
    active: true,
    teamId: "TM551420",
    ...(excludeFromStatAwards && { excludeFromStatAwards }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const players = [
  player("PLR1", "Able", 4),
  player("PLR2", "Baker", 9),
  player("COACH", "Coach", 28, true),
];

const games: Game[] = [
  {
    _id: "GME1",
    date: new Date("2026-01-15"),
    seasonId: "SSN2526",
    type: "BOTBC",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [
        { playerId: "PLR1" },
        { playerId: "PLR2" },
        { playerId: "COACH" },
      ],
      goals: ["COACH", "COACH", "PLR1", "PLR1", "PLR2"].map((scoredBy, i) => ({
        _id: `GOL${i}`,
        scoredBy,
        minute: i,
        second: 0,
        type: "EVEN",
      })),
      penalties: [],
    },
    opponentTeam: { opponentId: "OPN000001", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const context = { games, players, seasonId: "SSN2526" };

function entry(overrides: Partial<AwardEntry>): AwardEntry {
  return { _id: "AWD000001", winners: [], ...overrides };
}

describe("describeAwardWinners", () => {
  it("names the winners of an ordinary award", () => {
    expect(
      describeAwardWinners(
        entry({ category: "mvp", winners: ["PLR1", "PLR2"] }),
        context,
      ),
    ).toEqual({ winners: "#4 Sam Able, #9 Sam Baker", suggestion: null });
  });

  it("adds each winner's total to a stat award", () => {
    expect(
      describeAwardWinners(
        entry({
          category: "most-goals",
          competition: "BOTBC",
          winners: ["PLR1"],
        }),
        context,
      ).winners,
    ).toBe("#4 Sam Able · 2 goals");
  });

  it("suggests the leader for an unannounced stat award, skipping the coach", () => {
    expect(
      describeAwardWinners(
        entry({ category: "most-goals", competition: "BOTBC" }),
        context,
      ),
    ).toEqual({ winners: null, suggestion: "#4 Sam Able · 2 goals" });
  });

  it("makes no suggestion for other awards", () => {
    expect(describeAwardWinners(entry({ category: "mvp" }), context)).toEqual({
      winners: null,
      suggestion: null,
    });
  });

  it("makes no suggestion when the competition has no goals", () => {
    expect(
      describeAwardWinners(
        entry({ category: "most-goals", competition: "LLIHC" }),
        context,
      ).suggestion,
    ).toBeNull();
  });

  it("falls back to the id for a player that no longer exists", () => {
    expect(
      describeAwardWinners(
        entry({ category: "mvp", winners: ["PLR9"] }),
        context,
      ).winners,
    ).toBe("PLR9");
  });
});
