import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listPlayers, listGames, listSeasons } from "../../lib/repositories";
import { generateAllArtifacts, writeArtifacts } from "../../lib/publish/generate";
import {
  PlayersArtifactSchema,
  RosterConfigArtifactSchema,
  TeamArtifactSchema,
  ResultsArtifactSchema,
} from "../../lib/publish/schemas";

// Exercises the same generation + write path as `npm run publish:preview`
// (lib/publish/cli.ts), against the seeded dev database, writing to a temp
// directory instead of the real artifacts/ output dir.
describe("publish preview generation", () => {
  let outputDir: string;
  let paths: string[];

  beforeAll(async () => {
    const [players, games, seasons] = await Promise.all([
      listPlayers(),
      listGames(),
      listSeasons(),
    ]);
    if (players.length === 0 || games.length === 0 || seasons.length === 0) {
      throw new Error(
        "Seeded data not found — run `npm run db:seed` before the integration suite.",
      );
    }

    outputDir = await mkdtemp(join(tmpdir(), "warriors-publish-preview-"));
    const artifacts = generateAllArtifacts(players, games, seasons);
    paths = await writeArtifacts(artifacts, outputDir);
  });

  afterAll(async () => {
    if (outputDir) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("writes all four artifacts to disk", () => {
    expect(paths).toHaveLength(4);
  });

  it("players.json on disk validates against PlayersArtifactSchema", async () => {
    const contents = JSON.parse(await readFile(join(outputDir, "players.json"), "utf-8"));
    expect(() => PlayersArtifactSchema.parse(contents)).not.toThrow();
  });

  it("roster-config.json on disk validates against RosterConfigArtifactSchema", async () => {
    const contents = JSON.parse(
      await readFile(join(outputDir, "roster-config.json"), "utf-8"),
    );
    expect(() => RosterConfigArtifactSchema.parse(contents)).not.toThrow();
  });

  it("team.json on disk validates against TeamArtifactSchema", async () => {
    const contents = JSON.parse(await readFile(join(outputDir, "team.json"), "utf-8"));
    expect(() => TeamArtifactSchema.parse(contents)).not.toThrow();
  });

  it("results.json on disk validates against ResultsArtifactSchema", async () => {
    const contents = JSON.parse(await readFile(join(outputDir, "results.json"), "utf-8"));
    expect(() => ResultsArtifactSchema.parse(contents)).not.toThrow();
  });
});
