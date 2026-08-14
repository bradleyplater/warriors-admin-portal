import type { Player } from "../../schemas";

export interface RosterConfigArtifact {
  activePlayers: string[];
}

// roster-config.json (fixtures/golden/README.md) — the ids of every active
// player, sorted by shirt number for a deterministic, reviewable diff.
export function generateRosterConfigArtifact(players: Player[]): RosterConfigArtifact {
  return {
    activePlayers: players
      .filter((player) => player.active)
      .sort((a, b) => a.number - b.number)
      .map((player) => player._id),
  };
}
