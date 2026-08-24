import type { Player } from "../schemas";

// Comparator for Array.prototype.sort, ascending by shirt number. An
// inactive player may have no number at all (D9, KAN-36) — those sort last
// rather than colliding at the front via `undefined - undefined`.
export function compareByShirtNumber(
  a: Pick<Player, "number">,
  b: Pick<Player, "number">,
): number {
  if (a.number === undefined) return b.number === undefined ? 0 : 1;
  if (b.number === undefined) return -1;
  return a.number - b.number;
}
