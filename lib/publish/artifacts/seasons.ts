import type { Season } from "../../schemas";
import {
  resolveActiveSeason,
  sortSeasonsAscending,
} from "../../derived/season-order";

export interface SeasonsArtifact {
  activeSeason: string | null;
  seasons: string[];
}

// seasons.json (active-season change) — the website's current season and
// every season by name, oldest first. Unlike team.json/results.json it lists
// seasons with no games yet, so a new season shows before its first game.
export function generateSeasonsArtifact(seasons: Season[]): SeasonsArtifact {
  return {
    activeSeason: resolveActiveSeason(seasons)?.name ?? null,
    seasons: sortSeasonsAscending(seasons).map((season) => season.name),
  };
}
