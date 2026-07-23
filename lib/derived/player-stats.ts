import type { Game } from "../schemas";

export interface PlayerSeasonStats {
  goals: number;
  assists: number;
  points: number;
  pims: number;
  manOfTheMatch: number;
  warriorOfTheGame: number;
}

// docs/03-data-model.md "Derived stats" → Player season stats: goals =
// goals with scoredBy = player; assists = goals where player is
// assist1/assist2; points = goals + assists; PIMs = sum of the player's own
// penalty durations (bench penalties are a team-only total, never
// attributed to an individual — see deriveTeamSeasonStats); award counts =
// games in the season where the player was awarded. Fully derived from
// Game documents on every call, never stored.
export function derivePlayerSeasonStats(
  games: Game[],
  playerId: string,
  seasonId: string,
): PlayerSeasonStats {
  const seasonGames = games.filter((game) => game.seasonId === seasonId);

  let goals = 0;
  let assists = 0;
  let pims = 0;
  let manOfTheMatch = 0;
  let warriorOfTheGame = 0;

  for (const game of seasonGames) {
    for (const goal of game.team.goals) {
      if (goal.scoredBy === playerId) goals += 1;
      if (goal.assist1 === playerId || goal.assist2 === playerId) {
        assists += 1;
      }
    }
    for (const penalty of game.team.penalties) {
      if (penalty.offender === playerId) pims += penalty.duration;
    }
    if (game.manOfTheMatchPlayerId === playerId) manOfTheMatch += 1;
    if (game.warriorOfTheGamePlayerId === playerId) warriorOfTheGame += 1;
  }

  return {
    goals,
    assists,
    points: goals + assists,
    pims,
    manOfTheMatch,
    warriorOfTheGame,
  };
}
