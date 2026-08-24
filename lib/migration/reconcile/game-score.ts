import type { GoalType } from "../../schemas";
import { deriveScore } from "../../derived/score";
import type { GameScoreMismatch } from "./types";

const PERIOD_COUNT = 3;

export interface RawTimedGoal {
  type: GoalType;
  minute: number;
}

export interface RawPeriodScore {
  number: number;
  team?: number;
  opponent?: number;
}

export interface RawGameScore {
  team?: number;
  opponent?: number;
  periods?: RawPeriodScore[];
}

export interface RawGameDoc {
  _id: string;
  team: { goals: RawTimedGoal[] };
  opponentTeam: { goals: RawTimedGoal[] };
  score?: RawGameScore;
}

function pushIfMismatch(
  mismatches: GameScoreMismatch[],
  gameId: string,
  field: string,
  storedValue: number,
  computedValue: number,
): void {
  if (storedValue === computedValue) {
    return;
  }
  mismatches.push({
    key: `game-score:${gameId}:${field}`,
    dimension: "game-score",
    entityId: gameId,
    field,
    storedValue,
    computedValue,
  });
}

// docs/04-migration-plan.md Step 3: every game's score and period line vs
// the stored `score` field — team/opponent totals (already shootout-
// inclusive, per deriveScore) and all 3 periods. Recomputed directly from
// the raw team/opponentTeam goal arrays — deriveScore only needs
// {type, minute}, so this never depends on the game passing full
// GameSchema validation. A game with no stored `score` at all has nothing
// to compare and is skipped.
export function compareGameScoreMismatches(
  games: RawGameDoc[],
): GameScoreMismatch[] {
  const mismatches: GameScoreMismatch[] = [];

  for (const game of games) {
    if (!game.score) {
      continue;
    }

    const computed = deriveScore(game.team.goals, game.opponentTeam.goals);
    const storedPeriodsByNumber = new Map(
      (game.score.periods ?? []).map((period) => [period.number, period]),
    );

    pushIfMismatch(
      mismatches,
      game._id,
      "score.team",
      game.score.team ?? 0,
      computed.team,
    );
    pushIfMismatch(
      mismatches,
      game._id,
      "score.opponent",
      game.score.opponent ?? 0,
      computed.opponent,
    );

    for (let index = 0; index < PERIOD_COUNT; index++) {
      const periodNumber = index + 1;
      const storedPeriod = storedPeriodsByNumber.get(periodNumber);
      const computedPeriod = computed.periods[index];

      pushIfMismatch(
        mismatches,
        game._id,
        `score.period${periodNumber}.team`,
        storedPeriod?.team ?? 0,
        computedPeriod.team,
      );
      pushIfMismatch(
        mismatches,
        game._id,
        `score.period${periodNumber}.opponent`,
        storedPeriod?.opponent ?? 0,
        computedPeriod.opponent,
      );
    }
  }

  return mismatches;
}
