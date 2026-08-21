import type { ActiveReviewPlayer } from "./list";

// Migration Plan Step 2 (docs/04-migration-plan.md): "nothing proceeds until
// every player is marked". An empty list is vacuously complete — nothing to
// review means nothing is blocking. No cutover mechanism consumes this yet
// (none exists in the app); it's exposed for a later ticket to gate on.
export function isActiveReviewComplete(players: ActiveReviewPlayer[]): boolean {
  return players.every((player) => typeof player.active === "boolean");
}
