import { getOpponent, listOpponents } from "../repositories";

// Shown only if a game points at an opponent that no longer exists — which
// blocked deletion (and the migration's verification) should prevent, but
// a page should degrade rather than crash if it ever happens.
export const UNKNOWN_OPPONENT = "Unknown opponent";

export async function getOpponentName(opponentId: string): Promise<string> {
  const opponent = await getOpponent(opponentId);
  return opponent?.name ?? UNKNOWN_OPPONENT;
}

// For pages listing many games: one query for every opponent (a small
// collection) rather than one per game.
export async function getOpponentNamesById(): Promise<Map<string, string>> {
  const opponents = await listOpponents();
  return new Map(opponents.map((opponent) => [opponent._id, opponent.name]));
}

export function opponentNameFrom(
  names: Map<string, string>,
  opponentId: string,
): string {
  return names.get(opponentId) ?? UNKNOWN_OPPONENT;
}
