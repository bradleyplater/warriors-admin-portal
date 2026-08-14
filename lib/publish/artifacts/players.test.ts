import { describe, expect, it } from "vitest";
import { generatePlayersArtifact } from "./players";
import { PlayersArtifactSchema } from "../schemas";
import type { Player, Game, Season } from "../../schemas";

const seasons: Season[] = [
  { _id: "SSN2223", name: "22/23", createdAt: new Date(), updatedAt: new Date() },
  { _id: "SSN2425", name: "24/25", createdAt: new Date(), updatedAt: new Date() },
];

function player(overrides: Partial<Player> = {}): Player {
  return {
    _id: "PLR1",
    firstName: "Jamie",
    surname: "Ashworth",
    number: 9,
    positions: ["Forward"],
    active: true,
    teamId: "TM551420",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function game(overrides: Partial<Game> = {}): Game {
  return {
    _id: "GME1",
    date: new Date("2025-01-15"),
    seasonId: "SSN2425",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR1" }],
      goals: [],
      penalties: [],
    },
    opponentTeam: { name: "Opponents", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("generatePlayersArtifact", () => {
  it("validates against PlayersArtifactSchema", () => {
    const artifact = generatePlayersArtifact(
      [player(), player({ _id: "PLR2", number: 5, nickname: "Robbo" })],
      [game()],
      seasons,
    );
    expect(() => PlayersArtifactSchema.parse(artifact)).not.toThrow();
  });

  it("sorts players by shirt number ascending", () => {
    const artifact = generatePlayersArtifact(
      [player({ _id: "PLR1", number: 20 }), player({ _id: "PLR2", number: 3 })],
      [],
      seasons,
    );
    expect(artifact.map((p) => p.id)).toEqual(["PLR2", "PLR1"]);
  });

  it("joins multiple positions with a slash and omits nickname when unset", () => {
    const artifact = generatePlayersArtifact(
      [player({ positions: ["Forward", "Defence"] })],
      [],
      seasons,
    );
    expect(artifact[0].position).toBe("Forward / Defence");
    expect("nickname" in artifact[0]).toBe(false);
  });

  it("includes nickname when set", () => {
    const artifact = generatePlayersArtifact([player({ nickname: "Robbo" })], [], seasons);
    expect(artifact[0].nickname).toBe("Robbo");
  });

  it("gives a player who never appears in any game an empty stats array, not an omitted entry", () => {
    const artifact = generatePlayersArtifact([player()], [], seasons);
    expect(artifact).toHaveLength(1);
    expect(artifact[0].stats).toEqual([]);
  });

  it("includes a season only when the player was rostered that season, in chronological order", () => {
    const games = [
      game({ _id: "GME1", seasonId: "SSN2425" }),
      game({ _id: "GME2", seasonId: "SSN2223" }),
    ];
    const artifact = generatePlayersArtifact([player()], games, seasons);
    expect(artifact[0].stats.map((s) => s.season)).toEqual(["22/23", "24/25"]);
  });

  it("omits warriorOfTheGame/manOfTheMatch when zero, includes them when positive", () => {
    const withAward = generatePlayersArtifact(
      [player()],
      [game({ warriorOfTheGamePlayerId: "PLR1" })],
      seasons,
    );
    expect(withAward[0].stats[0].warriorOfTheGame).toBe(1);
    expect(withAward[0].stats[0].manOfTheMatch).toBeUndefined();
    expect("manOfTheMatch" in withAward[0].stats[0]).toBe(false);
  });
});
