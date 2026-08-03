import { describe, expect, it } from "vitest";
import { deriveScore } from "./score";

describe("deriveScore", () => {
  it("returns 0-0 with empty periods and no shootout when neither side has recorded goals", () => {
    expect(deriveScore([], [])).toEqual({
      team: 0,
      opponent: 0,
      periods: [
        { team: 0, opponent: 0 },
        { team: 0, opponent: 0 },
        { team: 0, opponent: 0 },
      ],
      shootout: null,
    });
  });

  it("counts only regulation (non-SO) goals per side", () => {
    const teamGoals = [
      { type: "EVEN", minute: 1 },
      { type: "PP", minute: 2 },
      { type: "SH", minute: 3 },
    ] as const;
    const opponentGoals = [{ type: "EVEN", minute: 1 }] as const;

    const score = deriveScore([...teamGoals], [...opponentGoals]);
    expect(score.team).toBe(3);
    expect(score.opponent).toBe(1);
  });

  it("gives the shootout winner one additional goal", () => {
    const teamGoals = [
      { type: "EVEN", minute: 10 },
      { type: "SO", minute: 0 },
      { type: "SO", minute: 0 },
    ] as const;
    const opponentGoals = [
      { type: "EVEN", minute: 10 },
      { type: "SO", minute: 0 },
    ] as const;

    const score = deriveScore([...teamGoals], [...opponentGoals]);
    expect(score.team).toBe(2);
    expect(score.opponent).toBe(1);
  });

  it("combines regulation goals from both sides with the shootout decider", () => {
    const teamGoals = [
      { type: "EVEN", minute: 5 },
      { type: "PP", minute: 25 },
      { type: "EN", minute: 45 },
      { type: "SO", minute: 0 },
    ] as const;
    const opponentGoals = [
      { type: "EVEN", minute: 5 },
      { type: "EVEN", minute: 25 },
      { type: "PS", minute: 45 },
      { type: "SO", minute: 0 },
      { type: "SO", minute: 0 },
    ] as const;

    const score = deriveScore([...teamGoals], [...opponentGoals]);
    expect(score.team).toBe(3);
    expect(score.opponent).toBe(4);
  });

  it("buckets regulation goals into their 20-minute period", () => {
    const teamGoals = [
      { type: "EVEN", minute: 5 },
      { type: "PP", minute: 25 },
      { type: "EN", minute: 45 },
    ] as const;
    const opponentGoals = [{ type: "EVEN", minute: 19 }] as const;

    const score = deriveScore([...teamGoals], [...opponentGoals]);
    expect(score.periods).toEqual([
      { team: 1, opponent: 1 },
      { team: 1, opponent: 0 },
      { team: 1, opponent: 0 },
    ]);
  });

  it("leaves periods with no goals at 0-0", () => {
    const teamGoals = [{ type: "EVEN", minute: 45 }] as const;

    const score = deriveScore([...teamGoals], []);
    expect(score.periods).toEqual([
      { team: 0, opponent: 0 },
      { team: 0, opponent: 0 },
      { team: 1, opponent: 0 },
    ]);
  });

  it("excludes shootout goals from every period and reports them separately", () => {
    const teamGoals = [
      { type: "EVEN", minute: 5 },
      { type: "SO", minute: 0 },
    ] as const;
    const opponentGoals = [{ type: "SO", minute: 0 }] as const;

    const score = deriveScore([...teamGoals], [...opponentGoals]);
    expect(score.periods).toEqual([
      { team: 1, opponent: 0 },
      { team: 0, opponent: 0 },
      { team: 0, opponent: 0 },
    ]);
    expect(score.shootout).toEqual({ team: 1, opponent: 1 });
  });

  it("reports no shootout when neither side recorded an SO goal", () => {
    const teamGoals = [{ type: "EVEN", minute: 5 }] as const;

    const score = deriveScore([...teamGoals], []);
    expect(score.shootout).toBeNull();
  });
});
