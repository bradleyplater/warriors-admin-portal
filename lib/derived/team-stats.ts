import type { Game } from "../schemas";

export interface TeamSeasonStats {
  goals: number;
  assists: number;
  pims: number;
}

// docs/03-data-model.md "Derived stats" → Team season stats: goals/assists/
// PIMs summed across every game in the season, bench PIMs included (unlike
// derivePlayerSeasonStats, which never attributes a bench penalty to an
// individual).
export function deriveTeamSeasonStats(
  games: Game[],
  seasonId: string,
): TeamSeasonStats {
  const seasonGames = games.filter((game) => game.seasonId === seasonId);

  let goals = 0;
  let assists = 0;
  let pims = 0;

  for (const game of seasonGames) {
    for (const goal of game.team.goals) {
      goals += 1;
      if (goal.assist1 !== undefined) assists += 1;
      if (goal.assist2 !== undefined) assists += 1;
    }
    for (const penalty of game.team.penalties) {
      pims += penalty.duration;
    }
  }

  return { goals, assists, pims };
}
