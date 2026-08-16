import type {
  Goal,
  OpponentGoal,
  Penalty,
  OpponentPenalty,
  GoalType,
  PenaltyCode,
} from "../schemas";
import { deriveScore, periodIndexOf } from "./score";

export interface ResultGoal {
  playerId: string;
  assists: string[];
  minute: number;
  second: number;
  type: GoalType;
}

export interface ResultPenalty {
  offender: string;
  minute: number;
  second: number;
  type: PenaltyCode;
  duration: number;
}

export interface ResultPeriod {
  warriorsScore: number;
  opponentScore: number;
  goals: ResultGoal[];
  opponentGoals: ResultGoal[];
  penalties: ResultPenalty[];
  opponentPenalties: ResultPenalty[];
}

export interface ResultsScore {
  warriorsScore: number;
  opponentScore: number;
  period: {
    one: ResultPeriod;
    two: ResultPeriod;
    three: ResultPeriod;
  };
}

const PERIOD_KEYS = ["one", "two", "three"] as const;

function toResultGoal(goal: Goal): ResultGoal {
  return {
    playerId: goal.scoredBy,
    assists: [goal.assist1, goal.assist2].filter((id): id is string => id !== undefined),
    minute: goal.minute,
    second: goal.second,
    type: goal.type,
  };
}

// OpponentGoal never tracks assists (docs/03-data-model.md) — `assists` is
// always empty, kept present so both sides of the fixture share one shape.
function toResultOpponentGoal(goal: OpponentGoal): ResultGoal {
  return {
    playerId: goal.scoredBy,
    assists: [],
    minute: goal.minute,
    second: goal.second,
    type: goal.type,
  };
}

function toResultPenalty(penalty: Penalty | OpponentPenalty): ResultPenalty {
  return {
    offender: penalty.offender,
    minute: penalty.minute,
    second: penalty.second,
    type: penalty.type,
    duration: penalty.duration,
  };
}

function emptyPeriod(): ResultPeriod {
  return {
    warriorsScore: 0,
    opponentScore: 0,
    goals: [],
    opponentGoals: [],
    penalties: [],
    opponentPenalties: [],
  };
}

// docs/03-data-model.md "Derived stats" → Score: SO goals sit outside
// periods entirely, the same rule lib/derived/score.ts's derivePeriods
// applies for the live game page — kept consistent here rather than
// special-cased to match the legacy fixture's period-three placement (see
// KAN-30 plan discussion). Penalties have no such goal-type exception; every
// penalty is timed within regulation and always lands in a period.
export function deriveResultsScore(
  teamGoals: Goal[],
  opponentGoals: OpponentGoal[],
  teamPenalties: Penalty[],
  opponentPenalties: OpponentPenalty[],
): ResultsScore {
  const periods: Record<(typeof PERIOD_KEYS)[number], ResultPeriod> = {
    one: emptyPeriod(),
    two: emptyPeriod(),
    three: emptyPeriod(),
  };

  // Reuse deriveScore for the totals (regulation goals + shootout winner's
  // +1) rather than re-deriving the shootout rule here.
  const score = deriveScore(teamGoals, opponentGoals);

  for (const goal of teamGoals) {
    if (goal.type === "SO") continue;
    const period = periods[PERIOD_KEYS[periodIndexOf(goal.minute)]];
    period.goals.push(toResultGoal(goal));
    period.warriorsScore += 1;
  }

  for (const goal of opponentGoals) {
    if (goal.type === "SO") continue;
    const period = periods[PERIOD_KEYS[periodIndexOf(goal.minute)]];
    period.opponentGoals.push(toResultOpponentGoal(goal));
    period.opponentScore += 1;
  }

  for (const penalty of teamPenalties) {
    const period = periods[PERIOD_KEYS[periodIndexOf(penalty.minute)]];
    period.penalties.push(toResultPenalty(penalty));
  }
  for (const penalty of opponentPenalties) {
    const period = periods[PERIOD_KEYS[periodIndexOf(penalty.minute)]];
    period.opponentPenalties.push(toResultPenalty(penalty));
  }

  return { warriorsScore: score.team, opponentScore: score.opponent, period: periods };
}
