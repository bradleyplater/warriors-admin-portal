import type { GoalType } from "../schemas";

export interface PeriodScore {
  team: number;
  opponent: number;
}

export interface Score {
  team: number;
  opponent: number;
  periods: PeriodScore[];
  shootout: PeriodScore | null;
}

interface TimedGoal {
  type: GoalType;
  minute: number;
}

const PERIOD_COUNT = 3;
const PERIOD_LENGTH_MINUTES = 20;

function regulationGoals(goals: { type: GoalType }[]): number {
  return goals.filter((goal) => goal.type !== "SO").length;
}

function shootoutGoals(goals: { type: GoalType }[]): number {
  return goals.filter((goal) => goal.type === "SO").length;
}

// docs/03-data-model.md "Derived stats" → Score: periods are 20-minute
// running-clock buckets (minute 0-19 -> P1, 20-39 -> P2, 40-59 -> P3). SO
// goals sit outside periods entirely — they're shootout attempts, not tied
// to game clock time.
function periodIndexOf(minute: number): number {
  return Math.floor(minute / PERIOD_LENGTH_MINUTES);
}

function derivePeriods(
  teamGoals: TimedGoal[],
  opponentGoals: TimedGoal[],
): PeriodScore[] {
  const periods = Array.from({ length: PERIOD_COUNT }, () => ({
    team: 0,
    opponent: 0,
  }));

  for (const goal of teamGoals) {
    if (goal.type === "SO") continue;
    periods[periodIndexOf(goal.minute)].team += 1;
  }
  for (const goal of opponentGoals) {
    if (goal.type === "SO") continue;
    periods[periodIndexOf(goal.minute)].opponent += 1;
  }

  return periods;
}

// docs/03-data-model.md "Derived stats" → Score: team total = non-SO goals;
// the shootout winner (whichever side has more recorded SO goals) gets +1.
export function deriveScore(
  teamGoals: TimedGoal[],
  opponentGoals: TimedGoal[],
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

  const shootout =
    teamShootoutGoals > 0 || opponentShootoutGoals > 0
      ? { team: teamShootoutGoals, opponent: opponentShootoutGoals }
      : null;

  return {
    team,
    opponent,
    periods: derivePeriods(teamGoals, opponentGoals),
    shootout,
  };
}
