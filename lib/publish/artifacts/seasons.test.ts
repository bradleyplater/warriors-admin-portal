import { describe, expect, it } from "vitest";
import { generateSeasonsArtifact } from "./seasons";
import { SeasonsArtifactSchema } from "../schemas";
import type { Season } from "../../schemas";

function season(name: string, active?: boolean): Season {
  return {
    _id: `SSN${name.replace("/", "")}`,
    name,
    ...(active !== undefined && { active }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("generateSeasonsArtifact", () => {
  it("publishes a flagged season with no games as active, oldest first", () => {
    const artifact = generateSeasonsArtifact([season("26/27", true), season("25/26")]);
    expect(artifact).toEqual({ activeSeason: "26/27", seasons: ["25/26", "26/27"] });
  });

  it("falls back to the newest season when none is flagged", () => {
    const artifact = generateSeasonsArtifact([season("24/25"), season("25/26")]);
    expect(artifact.activeSeason).toBe("25/26");
  });

  it("publishes a null active season when there are no seasons", () => {
    expect(generateSeasonsArtifact([])).toEqual({ activeSeason: null, seasons: [] });
  });

  it("validates against SeasonsArtifactSchema", () => {
    const artifact = generateSeasonsArtifact([season("25/26")]);
    expect(() => SeasonsArtifactSchema.parse(artifact)).not.toThrow();
  });
});
