import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Player, Game, Opponent, Season, UpcomingGame } from "../schemas";
import { todayInLondon } from "../upcoming-games/time";
import {
  generatePlayersArtifact,
  generateRosterConfigArtifact,
  generateTeamArtifact,
  generateResultsArtifact,
  generateUpcomingGamesArtifact,
  generateSeasonsArtifact,
} from "./artifacts";

export interface GeneratedArtifacts {
  "players.json": unknown;
  "roster-config.json": unknown;
  "team.json": unknown;
  "results.json": unknown;
  "upcoming-games.json": unknown;
  "seasons.json": unknown;
}

// Shared by lib/publish/cli.ts (the real `npm run publish:preview` path) and
// the integration test, so both exercise the same generation + write logic.
export function generateAllArtifacts(
  players: Player[],
  games: Game[],
  seasons: Season[],
  opponents: Opponent[],
  upcomingGames: UpcomingGame[],
  // Decides which upcoming games are still upcoming — a parameter so tests
  // are deterministic; real callers take the default.
  today: string = todayInLondon(),
): GeneratedArtifacts {
  return {
    "players.json": generatePlayersArtifact(players, games, seasons),
    "roster-config.json": generateRosterConfigArtifact(players),
    "team.json": generateTeamArtifact(games, seasons),
    "results.json": generateResultsArtifact(games, seasons, opponents),
    "upcoming-games.json": generateUpcomingGamesArtifact(upcomingGames, opponents, today),
    "seasons.json": generateSeasonsArtifact(seasons),
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
