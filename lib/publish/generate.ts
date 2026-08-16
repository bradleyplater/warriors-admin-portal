import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Player, Game, Season } from "../schemas";
import {
  generatePlayersArtifact,
  generateRosterConfigArtifact,
  generateTeamArtifact,
  generateResultsArtifact,
} from "./artifacts";

export interface GeneratedArtifacts {
  "players.json": unknown;
  "roster-config.json": unknown;
  "team.json": unknown;
  "results.json": unknown;
}

// Shared by lib/publish/cli.ts (the real `npm run publish:preview` path) and
// the integration test, so both exercise the same generation + write logic.
export function generateAllArtifacts(
  players: Player[],
  games: Game[],
  seasons: Season[],
): GeneratedArtifacts {
  return {
    "players.json": generatePlayersArtifact(players, games, seasons),
    "roster-config.json": generateRosterConfigArtifact(players),
    "team.json": generateTeamArtifact(games, seasons),
    "results.json": generateResultsArtifact(games, seasons),
  };
}

// Shared by disk preview (writeArtifacts) and S3 upload/checksumming
// (lib/publish/run.ts), so both operate on byte-identical content.
export function serializeArtifact(content: unknown): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

export async function writeArtifacts(
  artifacts: GeneratedArtifacts,
  outputDir: string,
): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });

  const paths: string[] = [];
  for (const [file, content] of Object.entries(artifacts)) {
    const path = join(outputDir, file);
    await writeFile(path, serializeArtifact(content), "utf-8");
    paths.push(path);
  }
  return paths;
}
