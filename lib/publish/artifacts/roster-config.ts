import type { Player } from "../../schemas";
import { compareByShirtNumber } from "../../derived/player-order";

export interface RosterConfigArtifact {
  activePlayers: string[];
}

// roster-config.json (fixtures/golden/README.md) — the ids of every active
// player, sorted by shirt number for a deterministic, reviewable diff. Every
// active player is guaranteed a number by PlayerSchema's requireNumberWhenActive
// refine, enforced on every read via PlayerSchema.parse.
export function generateRosterConfigArtifact(players: Player[]): RosterConfigArtifact {
  return {
    activePlayers: players
      .filter((player) => player.active)
      .sort(compareByShirtNumber)
      .map((player) => player._id),
  };
}
