import type { Player, Game, Season } from "../../schemas";
import { derivePlayerSeasonStats } from "../../derived/player-stats";
import { sortSeasonsAscending } from "../../derived/season-order";

export interface PlayerSeasonStatsArtifact {
  season: string;
  games: number;
  goals: number;
  assists: number;
  pims: number;
  points: number;
  warriorOfTheGame?: number;
  manOfTheMatch?: number;
}

export interface PlayerArtifact {
  id: string;
  name: string;
  nickname?: string;
  number: number;
  position: string;
  stats: PlayerSeasonStatsArtifact[];
}

// players.json (fixtures/golden/README.md). Ordering and per-season
// inclusion are deliberately NOT copied from the legacy fixture (arbitrary
// insertion order, and it drops seasons with zero games played) — the rules
// below are picked to be the current, correct equivalent: players sorted by
// shirt number, season entries in chronological order, one entry per season
// the player actually appeared in.
export function generatePlayersArtifact(
  players: Player[],
  games: Game[],
  seasons: Season[],
): PlayerArtifact[] {
  const seasonsAscending = sortSeasonsAscending(seasons);

  return [...players]
    .sort((a, b) => a.number - b.number)
    .map((player) => {
      const stats: PlayerSeasonStatsArtifact[] = [];
      for (const season of seasonsAscending) {
        const derived = derivePlayerSeasonStats(games, player._id, season._id);
        if (derived.gamesPlayed === 0) continue;

        const entry: PlayerSeasonStatsArtifact = {
          season: season.name,
          games: derived.gamesPlayed,
          goals: derived.goals,
          assists: derived.assists,
          pims: derived.pims,
          points: derived.points,
        };
        if (derived.warriorOfTheGame > 0) entry.warriorOfTheGame = derived.warriorOfTheGame;
        if (derived.manOfTheMatch > 0) entry.manOfTheMatch = derived.manOfTheMatch;
        stats.push(entry);
      }

      const artifact: PlayerArtifact = {
        id: player._id,
        name: `${player.firstName} ${player.surname}`,
        number: player.number,
        position: player.positions.join(" / "),
        stats,
      };
      if (player.nickname !== undefined) artifact.nickname = player.nickname;
      return artifact;
    });
}
