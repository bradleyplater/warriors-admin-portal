import type { GameType } from "../../schemas";

// The legacy contract renders GameType "CHALLENGE" as "Challenge"; every
// other type (BOTBC, LLIHC, NIHC) passes through unchanged. Shared by
// results.json's `competition` and upcoming-games.json's `gameType` so the
// two can't drift apart.
const COMPETITION_LABELS: Partial<Record<GameType, string>> = {
  CHALLENGE: "Challenge",
};

export function competitionLabel(type: GameType): string {
  return COMPETITION_LABELS[type] ?? type;
}
