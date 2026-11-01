import { compareByShirtNumber } from "@/lib/derived/player-order";
import type { Player } from "@/lib/schemas";

export function playerLabel(player: Player): string {
  const name = `${player.firstName} ${player.surname}`;
  return player.number === undefined ? name : `#${player.number} ${name}`;
}

// The winner picker's order: the current squad by shirt number, then
// everyone else (past winners included) by surname.
export function playersForPicker(players: Player[]): {
  active: Player[];
  inactive: Player[];
} {
  return {
    active: players
      .filter((player) => player.active)
      .sort(compareByShirtNumber),
    inactive: players
      .filter((player) => !player.active)
      .sort(
        (a, b) =>
          a.surname.localeCompare(b.surname) ||
          a.firstName.localeCompare(b.firstName),
      ),
  };
}

// The read-through route's [name] segment: the photo's file name within its
// award's prefix.
export function photoName(key: string): string {
  return key.slice(key.lastIndexOf("/") + 1);
}
