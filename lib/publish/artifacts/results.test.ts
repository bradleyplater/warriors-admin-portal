import { describe, expect, it } from "vitest";
import { generateResultsArtifact } from "./results";
import { ResultsArtifactSchema } from "../schemas";
import type { Game, Season } from "../../schemas";

const seasons: Season[] = [
  { _id: "SSN2425", name: "24/25", createdAt: new Date(), updatedAt: new Date() },
];

function game(overrides: Partial<Game> = {}): Game {
  return {
    _id: "GME1",
    date: new Date("2025-01-15T19:00:00.000Z"),
    seasonId: "SSN2425",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
      goals: [],
      penalties: [],
    },
    opponentTeam: { name: "Rivals HC", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("generateResultsArtifact", () => {
  it("validates against ResultsArtifactSchema", () => {
    const artifact = generateResultsArtifact([game()], seasons);
    expect(() => ResultsArtifactSchema.parse(artifact)).not.toThrow();
  });

  it("resolves both season and seasonId to the season's name, not the SSN#### id", () => {
    const [entry] = generateResultsArtifact([game()], seasons);
    expect(entry.season).toBe("24/25");
    expect(entry.seasonId).toBe("24/25");
  });

  it("flattens the roster to an array of player ids", () => {
    const [entry] = generateResultsArtifact([game()], seasons);
    expect(entry.roster).toEqual(["PLR1", "PLR2"]);
  });

  it('defaults unset award/netminder fields to the "MISSING" sentinel', () => {
    const [entry] = generateResultsArtifact([game()], seasons);
    expect(entry.manOfTheMatchPlayerId).toBe("MISSING");
    expect(entry.warriorOfTheGamePlayerId).toBe("MISSING");
    expect(entry.netminderPlayerId).toBe("MISSING");
  });

  it("passes through a set award/netminder field instead of the sentinel", () => {
    const [entry] = generateResultsArtifact(
      [game({ netminderPlayerId: "PLR1" })],
      seasons,
    );
    expect(entry.netminderPlayerId).toBe("PLR1");
  });

  it('renders GameType "CHALLENGE" as "Challenge" and passes other types through unchanged', () => {
    const [challenge, llihc] = generateResultsArtifact(
      [game({ _id: "GME1", type: "CHALLENGE" }), game({ _id: "GME2", type: "LLIHC" })],
      seasons,
    );
    expect(challenge.competition).toBe("Challenge");
    expect(llihc.competition).toBe("LLIHC");
  });

  it("does not emit a logoImage field", () => {
    const [entry] = generateResultsArtifact([game()], seasons);
    expect("logoImage" in entry).toBe(false);
  });

  it("sorts games by date ascending", () => {
    const games = [
      game({ _id: "GME1", date: new Date("2025-03-01") }),
      game({ _id: "GME2", date: new Date("2025-01-01") }),
    ];
    const artifact = generateResultsArtifact(games, seasons);
    expect(artifact.map((entry) => entry.date)).toEqual([
      new Date("2025-01-01").toISOString(),
      new Date("2025-03-01").toISOString(),
    ]);
  });
});
