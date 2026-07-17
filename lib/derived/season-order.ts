import type { Season } from "../schemas";

// Season ids are "SSN" + a fixed-width year range (e.g. "SSN2223" before
// "SSN2324"), so ascending id order is ascending chronological order —
// no separate "current season" concept needed (see design.md).
export function sortSeasonsAscending(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => a._id.localeCompare(b._id));
}
