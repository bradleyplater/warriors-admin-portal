import { describe, expect, it } from "vitest";
import { generateRosterConfigArtifact } from "./roster-config";
import { RosterConfigArtifactSchema } from "../schemas";
import type { Player } from "../../schemas";

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

describe("generateRosterConfigArtifact", () => {
  it("validates against RosterConfigArtifactSchema", () => {
    const artifact = generateRosterConfigArtifact([player()]);
    expect(() => RosterConfigArtifactSchema.parse(artifact)).not.toThrow();
  });

  it("includes only active players, sorted by shirt number", () => {
    const artifact = generateRosterConfigArtifact([
      player({ _id: "PLR1", number: 20, active: true }),
      player({ _id: "PLR2", number: 3, active: true }),
      player({ _id: "PLR3", number: 1, active: false }),
    ]);
    expect(artifact.activePlayers).toEqual(["PLR2", "PLR1"]);
  });
});
