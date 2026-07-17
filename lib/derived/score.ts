import type { GoalType } from "../schemas";

export interface Score {
  team: number;
  opponent: number;
}

function regulationGoals(goals: { type: GoalType }[]): number {
  return goals.filter((goal) => goal.type !== "SO").length;
}

function shootoutGoals(goals: { type: GoalType }[]): number {
  return goals.filter((goal) => goal.type === "SO").length;
}

// docs/03-data-model.md "Derived stats" → Score: team total = non-SO goals;
// the shootout winner (whichever side has more recorded SO goals) gets +1.
export function deriveScore(
  teamGoals: { type: GoalType }[],
  opponentGoals: { type: GoalType }[],
): Score {
  let team = regulationGoals(teamGoals);
  let opponent = regulationGoals(opponentGoals);

  const teamShootoutGoals = shootoutGoals(teamGoals);
  const opponentShootoutGoals = shootoutGoals(opponentGoals);

  if (teamShootoutGoals > opponentShootoutGoals) {
    team += 1;
  } else if (opponentShootoutGoals > teamShootoutGoals) {
    opponent += 1;
  }

  return { team, opponent };
}
