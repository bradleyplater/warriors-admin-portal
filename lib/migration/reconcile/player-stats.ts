import type { Game } from "../../schemas";
import { derivePlayerSeasonStats } from "../../derived/player-stats";
import type { PlayerStatsMismatch } from "./types";

// Only the fields legacy `stats[]` entries actually store — `points` is
// derived-only and was never stored, so there is nothing to reconcile it
// against (docs/03-data-model.md's Player "Changes from today": `stats[]`
// is removed entirely, not migrated field-by-field).
const COMPARABLE_FIELDS = [
  "gamesPlayed",
  "goals",
  "assists",
  "pims",
  "manOfTheMatch",
  "warriorOfTheGame",
] as const;

export interface RawPlayerStatsEntry {
  seasonId: string;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  pims?: number;
  manOfTheMatch?: number;
  warriorOfTheGame?: number;
}

export interface RawPlayerDoc {
  _id: string;
  stats?: RawPlayerStatsEntry[];
}

export interface RawTeamPlayerEntry {
  playerId: string;
  stats?: RawPlayerStatsEntry[];
}

function byField<T extends { seasonId: string }>(
  entries: T[] | undefined,
): Map<string, T> {
  return new Map((entries ?? []).map((entry) => [entry.seasonId, entry]));
}

// docs/04-migration-plan.md Step 3: every player's per-season stats vs
// stored Player.stats *and* the Team.players[].stats copy. A season/field
// with no stored entry at all is treated as 0 (docs/03-data-model.md:
// "some player-season stat entries missing manOfTheMatch/warriorOfTheGame
// fields, treated as 0 by the recompute" — applied here to a missing
// season entry too, not just a missing field on an existing one).
export function comparePlayerStatsMismatches(
  players: RawPlayerDoc[],
  teamPlayers: RawTeamPlayerEntry[],
  games: Game[],
  seasonIds: string[],
): PlayerStatsMismatch[] {
  const mismatches: PlayerStatsMismatch[] = [];
  const teamPlayersByPlayerId = new Map(
    teamPlayers.map((entry) => [entry.playerId, entry]),
  );

  for (const player of players) {
    const playerStatsBySeason = byField(player.stats);
    const teamCopyStatsBySeason = byField(
      teamPlayersByPlayerId.get(player._id)?.stats,
    );

    for (const seasonId of seasonIds) {
      const computed = derivePlayerSeasonStats(games, player._id, seasonId);

      for (const field of COMPARABLE_FIELDS) {
        const computedValue = computed[field];

        const playerStored = playerStatsBySeason.get(seasonId)?.[field] ?? 0;
        if (playerStored !== computedValue) {
          mismatches.push({
            key: `player-stats:${player._id}:${seasonId}:${field}:player`,
            dimension: "player-stats",
            entityId: player._id,
            seasonId,
            field,
            source: "player",
            storedValue: playerStored,
            computedValue,
          });
        }

        const teamCopyStored =
          teamCopyStatsBySeason.get(seasonId)?.[field] ?? 0;
        if (teamCopyStored !== computedValue) {
          mismatches.push({
            key: `player-stats:${player._id}:${seasonId}:${field}:teamCopy`,
            dimension: "player-stats",
            entityId: player._id,
            seasonId,
            field,
            source: "teamCopy",
            storedValue: teamCopyStored,
            computedValue,
          });
        }
      }
    }
  }

  return mismatches;
}
