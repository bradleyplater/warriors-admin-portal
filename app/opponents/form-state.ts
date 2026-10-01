export type OpponentFormState = {
  errors: Record<string, string[] | undefined>;
};

export const initialOpponentFormState: OpponentFormState = {
  errors: {},
};

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

// Why a delete was refused, e.g. "This opponent is used by 3 games and
// 1 upcoming game, so it can't be deleted."
export function describeBlockedOpponentDelete(
  gameCount: number,
  upcomingGameCount: number,
): string {
  const uses = [
    gameCount > 0 && plural(gameCount, "game"),
    upcomingGameCount > 0 && plural(upcomingGameCount, "upcoming game"),
  ].filter(Boolean);
  return `This opponent is used by ${uses.join(" and ")}, so it can't be deleted.`;
}
