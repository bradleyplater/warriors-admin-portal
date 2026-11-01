import type { AwardEntry, Game, Player } from "@/lib/schemas";
import {
  awardStat,
  formatStat,
  statAwardLeader,
  statAwardTotal,
} from "@/lib/awards/stat-leaders";
import { playerLabel } from "./players";

export interface AwardWinnerContext {
  games: Game[];
  players: Player[];
  seasonId: string;
}

export interface AwardWinnerText {
  // "#4 Bradley Plater · 29 goals", or null while to be announced.
  winners: string | null;
  // For an unannounced stat award: who leads it from the games. Null
  // otherwise, or when nobody has scored.
  suggestion: string | null;
}

export function describeAwardWinners(
  entry: AwardEntry,
  { games, players, seasonId }: AwardWinnerContext,
): AwardWinnerText {
  const byId = new Map(players.map((player) => [player._id, player]));
  const label = (id: string) => {
    const player = byId.get(id);
    return player ? playerLabel(player) : id;
  };
  const stat = awardStat(entry);

  if (entry.winners.length > 0) {
    return {
      winners: entry.winners
        .map((id) =>
          stat && !entry.hideTotal
            ? `${label(id)} · ${formatStat(statAwardTotal(games, seasonId, entry.competition, stat, id), stat)}`
            : label(id),
        )
        .join(", ")
        .concat(stat && entry.hideTotal ? " · total not shown" : ""),
      suggestion: null,
    };
  }

  const leader =
    stat && statAwardLeader(games, players, seasonId, entry.competition, stat);
  return {
    winners: null,
    suggestion: leader
      ? `${leader.playerIds.map(label).join(" & ")} · ${formatStat(leader.value, stat)}`
      : null,
  };
}
