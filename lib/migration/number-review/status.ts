import type { NumberReviewPlayer } from "./list";

// Migration Plan Step 2 / D9: only active out-of-range players need
// renumbering, so a resolved player simply stops matching the review's
// query and drops off the list — an empty list is vacuously complete. No
// cutover mechanism consumes this yet (none exists in the app), same as D8.
export function isNumberReviewComplete(players: NumberReviewPlayer[]): boolean {
  return players.length === 0;
}
