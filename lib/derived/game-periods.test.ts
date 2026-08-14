import { describe, expect, it } from "vitest";
import { deriveResultsScore } from "./game-periods";
import type { Goal, OpponentGoal, Penalty, OpponentPenalty } from "../schemas";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    _id: "GOL1",
    scoredBy: "PLR1",
    minute: 5,
    second: 0,
    type: "EVEN",
    ...overrides,
  };
}

function opponentGoal(overrides: Partial<OpponentGoal> = {}): OpponentGoal {
  return {
    _id: "OGL1",
    scoredBy: "Rival Player",
    minute: 5,
    second: 0,
    type: "EVEN",
    ...overrides,
  };
}

function penalty(overrides: Partial<Penalty> = {}): Penalty {
  return {
    _id: "PEN1",
    offender: "PLR1",
    minute: 5,
    second: 0,
    type: "TRIP",
    duration: 2,
    ...overrides,
  };
}

function opponentPenalty(overrides: Partial<OpponentPenalty> = {}): OpponentPenalty {
  return {
    _id: "OPP1",
    offender: "Rival Player",
    minute: 5,
    second: 0,
    type: "TRIP",
    duration: 2,
    ...overrides,
  };
}

describe("deriveResultsScore", () => {
  it("returns empty, zeroed periods when nothing was recorded", () => {
    const result = deriveResultsScore([], [], [], []);
    expect(result).toEqual({
      warriorsScore: 0,
      opponentScore: 0,
      period: {
        one: { warriorsScore: 0, opponentScore: 0, goals: [], opponentGoals: [], penalties: [], opponentPenalties: [] },
        two: { warriorsScore: 0, opponentScore: 0, goals: [], opponentGoals: [], penalties: [], opponentPenalties: [] },
        three: { warriorsScore: 0, opponentScore: 0, goals: [], opponentGoals: [], penalties: [], opponentPenalties: [] },
      },
    });
  });

  it("buckets a goal at minute 19 into period one and minute 20 into period two", () => {
    const result = deriveResultsScore(
      [goal({ minute: 19 }), goal({ _id: "GOL2", minute: 20 })],
      [],
      [],
      [],
    );
    expect(result.period.one.goals).toHaveLength(1);
    expect(result.period.two.goals).toHaveLength(1);
    expect(result.period.one.warriorsScore).toBe(1);
    expect(result.period.two.warriorsScore).toBe(1);
  });

  it("buckets a goal at minute 39 into period two and minute 40 into period three", () => {
    const result = deriveResultsScore(
      [goal({ minute: 39 }), goal({ _id: "GOL2", minute: 40 })],
      [],
      [],
      [],
    );
    expect(result.period.two.goals).toHaveLength(1);
    expect(result.period.three.goals).toHaveLength(1);
  });

  it("combines assist1 and assist2 into an assists array, omitting unset assists", () => {
    const result = deriveResultsScore(
      [
        goal({ _id: "GOL1", minute: 1, assist1: "PLR2", assist2: "PLR3" }),
        goal({ _id: "GOL2", minute: 2, assist1: "PLR2" }),
        goal({ _id: "GOL3", minute: 3 }),
      ],
      [],
      [],
      [],
    );
    const [withBoth, withOne, withNone] = result.period.one.goals;
    expect(withBoth.assists).toEqual(["PLR2", "PLR3"]);
    expect(withOne.assists).toEqual(["PLR2"]);
    expect(withNone.assists).toEqual([]);
  });

  it("maps opponent goals with the free-text scorer as playerId and an always-empty assists array", () => {
    const result = deriveResultsScore([], [opponentGoal({ scoredBy: "B Addison", minute: 1 })], [], []);
    expect(result.period.one.opponentGoals).toEqual([
      { playerId: "B Addison", assists: [], minute: 1, second: 0, type: "EVEN" },
    ]);
  });

  it("excludes shootout goals from every period, matching lib/derived/score.ts's rule, while still counting them in the top-level score", () => {
    const result = deriveResultsScore(
      [goal({ minute: 5 }), goal({ _id: "GOL2", minute: 65, type: "SO" })],
      [opponentGoal({ minute: 5 })],
      [],
      [],
    );
    expect(result.period.one.goals).toHaveLength(1);
    expect(result.period.two.goals).toHaveLength(0);
    expect(result.period.three.goals).toHaveLength(0);
    expect(result.warriorsScore).toBe(2); // 1 regulation + shootout winner's +1
    expect(result.opponentScore).toBe(1);
  });

  it("buckets team and opponent penalties into their period without altering the score", () => {
    const result = deriveResultsScore(
      [],
      [],
      [penalty({ minute: 45 })],
      [opponentPenalty({ minute: 10 })],
    );
    expect(result.period.three.penalties).toEqual([
      { offender: "PLR1", minute: 45, second: 0, type: "TRIP", duration: 2 },
    ]);
    expect(result.period.one.opponentPenalties).toEqual([
      { offender: "Rival Player", minute: 10, second: 0, type: "TRIP", duration: 2 },
    ]);
    expect(result.warriorsScore).toBe(0);
    expect(result.opponentScore).toBe(0);
  });
});
