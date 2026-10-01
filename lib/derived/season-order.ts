import type { Season } from "../schemas";

// Season ids are "SSN" + a fixed-width year range (e.g. "SSN2223" before
// "SSN2324"), so ascending id order is ascending chronological order.
export function sortSeasonsAscending(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => a._id.localeCompare(b._id));
}

// The website's current season: the one flagged `active`, else the newest.
// Tolerates several flagged seasons (the newest flagged wins) so "at most
// one" needs no database guarantee — see the active-season design.
export function resolveActiveSeason(seasons: Season[]): Season | null {
  const ascending = sortSeasonsAscending(seasons);
  const flagged = ascending.filter((season) => season.active);
  return flagged.at(-1) ?? ascending.at(-1) ?? null;
}
