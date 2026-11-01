import { derivePlayerSeasonStats } from "../derived/player-stats";
import {
  AWARD_CATEGORIES,
  type AwardCompetition,
  type AwardEntry,
  type Game,
  type Player,
} from "../schemas";

export type AwardStat = "goals" | "assists" | "points";

// The stat that decides an award, for most goals/assists/points only.
export function awardStat(
  entry: Pick<AwardEntry, "category">,
): AwardStat | undefined {
  if (!entry.category) return undefined;
  const category = AWARD_CATEGORIES[entry.category];
  return "stat" in category ? category.stat : undefined;
}

// "1 goal", "29 goals".
export function formatStat(value: number, stat: AwardStat): string {
  return `${value} ${value === 1 ? stat.slice(0, -1) : stat}`;
}

// The season's games an award covers: one competition's, or every game for
// a club-wide award.
export function gamesForAward(
  games: Game[],
  seasonId: string,
  competition: AwardCompetition | undefined,
): Game[] {
  return games.filter(
    (game) =>
      game.seasonId === seasonId &&
      (competition === undefined || game.type === competition),
  );
}

// A player's total of `stat` in the games an award covers, derived from the
// games like every other stat.
export function statAwardTotal(
  games: Game[],
  seasonId: string,
  competition: AwardCompetition | undefined,
  stat: AwardStat,
  playerId: string,
): number {
  return derivePlayerSeasonStats(
    gamesForAward(games, seasonId, competition),
    playerId,
    seasonId,
  )[stat];
}

export interface StatAwardLeader {
  // More than one on a tie.
  playerIds: string[];
  value: number;
}

// Who leads `stat` in the games an award covers, leaving out players flagged
// excludeFromStatAwards (the coach). Only a suggestion for the admin — the
// award itself is whoever was named on the night. Null when nobody has
// scored.
export function statAwardLeader(
  games: Game[],
  players: Player[],
  seasonId: string,
  competition: AwardCompetition | undefined,
  stat: AwardStat,
): StatAwardLeader | null {
  const covered = gamesForAward(games, seasonId, competition);
  const excluded = new Set(
    players
      .filter((player) => player.excludeFromStatAwards)
      .map((player) => player._id),
  );

  // Everyone rostered or credited in those games, in first-seen order.
  const candidates = new Set<string>();
  for (const game of covered) {
    for (const entry of game.team.roster) candidates.add(entry.playerId);
    for (const goal of game.team.goals) {
      for (const id of [goal.scoredBy, goal.assist1, goal.assist2]) {
        if (id) candidates.add(id);
      }
    }
  }

  let leader: StatAwardLeader | null = null;
  for (const playerId of candidates) {
    if (excluded.has(playerId)) continue;
    const value = derivePlayerSeasonStats(covered, playerId, seasonId)[stat];
    if (value === 0) continue;
    if (leader === null || value > leader.value) {
      leader = { playerIds: [playerId], value };
    } else if (value === leader.value) {
      leader.playerIds.push(playerId);
    }
  }
  return leader;
}
