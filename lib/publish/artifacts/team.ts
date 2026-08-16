import type { Game, Season } from "../../schemas";
import { deriveTeamSeasonStats } from "../../derived/team-stats";
import { sortSeasonsAscending } from "../../derived/season-order";

export interface TeamSeasonStatsArtifact {
  season: string;
  games: number;
  goalsFor: number;
  pims: number;
  goalsAgainst: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface TeamArtifact {
  stats: TeamSeasonStatsArtifact[];
}

// team.json (fixtures/golden/README.md) — one entry per season (unlike
// players.json, which drops a player's zero-game seasons; a season itself
// is never "not the team's").
export function generateTeamArtifact(games: Game[], seasons: Season[]): TeamArtifact {
  return {
    stats: sortSeasonsAscending(seasons).map((season) => {
      const derived = deriveTeamSeasonStats(games, season._id);
      return {
        season: season.name,
        games: derived.gamesPlayed,
        goalsFor: derived.goalsFor,
        pims: derived.pims,
        goalsAgainst: derived.goalsAgainst,
        wins: derived.wins,
        draws: derived.draws,
        losses: derived.losses,
      };
    }),
  };
}
