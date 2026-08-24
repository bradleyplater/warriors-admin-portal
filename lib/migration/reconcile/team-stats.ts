import type { Game } from "../../schemas";
import { deriveTeamSeasonStats } from "../../derived/team-stats";
import type { TeamStatsMismatch } from "./types";

// The only fields the legacy Team.stats[] entries actually store —
// goalsFor/goalsAgainst/wins/draws/losses have no stored counterpart at
// all (confirmed against real production data), so there's nothing to
// reconcile them against.
const COMPARABLE_FIELDS = ["gamesPlayed", "goals", "assists", "pims"] as const;

export interface RawTeamStatsEntry {
  seasonId: string;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  pims?: number;
}

// docs/04-migration-plan.md Step 3: team per-season stats vs stored
// Team.stats. A season with no stored entry at all is treated as 0, same
// rule as the player-stats comparison.
export function compareTeamStatsMismatches(
  teamId: string,
  storedStats: RawTeamStatsEntry[] | undefined,
  games: Game[],
  seasonIds: string[],
): TeamStatsMismatch[] {
  const mismatches: TeamStatsMismatch[] = [];
  const statsBySeason = new Map(
    (storedStats ?? []).map((entry) => [entry.seasonId, entry]),
  );

  for (const seasonId of seasonIds) {
    const computed = deriveTeamSeasonStats(games, seasonId);

    for (const field of COMPARABLE_FIELDS) {
      const computedValue = computed[field];
      const stored = statsBySeason.get(seasonId)?.[field] ?? 0;
      if (stored !== computedValue) {
        mismatches.push({
          key: `team-stats:${teamId}:${seasonId}:${field}`,
          dimension: "team-stats",
          entityId: teamId,
          seasonId,
          field,
          storedValue: stored,
          computedValue,
        });
      }
    }
  }

  return mismatches;
}
