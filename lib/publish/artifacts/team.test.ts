import { describe, expect, it } from "vitest";
import { generateTeamArtifact } from "./team";
import { TeamArtifactSchema } from "../schemas";
import type { Game, Season } from "../../schemas";

const seasons: Season[] = [
  { _id: "SSN2223", name: "22/23", createdAt: new Date(), updatedAt: new Date() },
  { _id: "SSN2425", name: "24/25", createdAt: new Date(), updatedAt: new Date() },
];

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
      goals: [{ _id: "GOL1", scoredBy: "PLR1", minute: 5, second: 0, type: "EVEN" }],
      penalties: [],
    },
    opponentTeam: { name: "Opponents", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("generateTeamArtifact", () => {
  it("validates against TeamArtifactSchema", () => {
    const artifact = generateTeamArtifact([game()], seasons);
    expect(() => TeamArtifactSchema.parse(artifact)).not.toThrow();
  });

  it("includes one entry per season in chronological order, even a season with no games", () => {
    const artifact = generateTeamArtifact([game()], seasons);
    expect(artifact.stats.map((s) => s.season)).toEqual(["22/23", "24/25"]);
    expect(artifact.stats[0]).toMatchObject({ games: 0, goalsFor: 0, goalsAgainst: 0 });
  });

  it("maps deriveTeamSeasonStats' gamesPlayed to the legacy `games` key", () => {
    const artifact = generateTeamArtifact([game()], seasons);
    const current = artifact.stats.find((s) => s.season === "24/25");
    expect(current).toMatchObject({ games: 1, goalsFor: 1, wins: 1 });
  });
});
