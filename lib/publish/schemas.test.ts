import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PlayersArtifactSchema,
  RosterConfigArtifactSchema,
  TeamArtifactSchema,
  ResultsArtifactSchema,
} from "./schemas";

const GOLDEN_DIR = join(__dirname, "../../fixtures/golden");

function readFixture(file: string): unknown {
  return JSON.parse(readFileSync(join(GOLDEN_DIR, file), "utf-8"));
}

// The drift detector: if the website's JSON contract ever changes shape and
// fixtures/golden/ is refreshed to match, one of these fails until the
// schema (and the generator that must satisfy it) catches up.
describe("artifact schemas against the golden fixtures", () => {
  it("players.json matches PlayersArtifactSchema", () => {
    expect(() => PlayersArtifactSchema.parse(readFixture("players.json"))).not.toThrow();
  });

  it("roster-config.json matches RosterConfigArtifactSchema", () => {
    expect(() =>
      RosterConfigArtifactSchema.parse(readFixture("roster-config.json")),
    ).not.toThrow();
  });

  it("team.json matches TeamArtifactSchema", () => {
    expect(() => TeamArtifactSchema.parse(readFixture("team.json"))).not.toThrow();
  });

  it("results.json matches ResultsArtifactSchema", () => {
    expect(() => ResultsArtifactSchema.parse(readFixture("results.json"))).not.toThrow();
  });
});
