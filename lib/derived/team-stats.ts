import type { Game } from "../schemas";
import { deriveScore } from "./score";

export interface TeamSeasonStats {
  gamesPlayed: number;
  goals: number;
  assists: number;
  pims: number;
  goalsFor: number;
  goalsAgainst: number;
  wins: number;
  draws: number;
  losses: number;
}

// docs/03-data-model.md "Derived stats" → Team season stats: games played =
// games in season; goals/assists/PIMs summed across every game in the
// season, bench PIMs included (unlike derivePlayerSeasonStats, which never
// attributes a bench penalty to an individual). goalsFor/goalsAgainst and
// wins/draws/losses reuse deriveScore's final (post-shootout) totals per
// game, so a shootout winner counts as a win, not a draw.
export function deriveTeamSeasonStats(
  games: Game[],
  seasonId: string,
): TeamSeasonStats {
  const seasonGames = games.filter((game) => game.seasonId === seasonId);

  let goals = 0;
  let assists = 0;
  let pims = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (const game of seasonGames) {
    for (const goal of game.team.goals) {
      goals += 1;
      if (goal.assist1 !== undefined) assists += 1;
      if (goal.assist2 !== undefined) assists += 1;
    }
    for (const penalty of game.team.penalties) {
      pims += penalty.duration;
    }

    const score = deriveScore(game.team.goals, game.opponentTeam.goals);
    goalsFor += score.team;
    goalsAgainst += score.opponent;
    if (score.team > score.opponent) wins += 1;
    else if (score.team < score.opponent) losses += 1;
    else draws += 1;
  }

  return {
    gamesPlayed: seasonGames.length,
    goals,
    assists,
    pims,
    goalsFor,
    goalsAgainst,
    wins,
    draws,
    losses,
  };
}
