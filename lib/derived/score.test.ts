import { describe, expect, it } from "vitest";
import { deriveScore } from "./score";

describe("deriveScore", () => {
  it("returns 0-0 when neither side has recorded goals", () => {
    expect(deriveScore([], [])).toEqual({ team: 0, opponent: 0 });
  });

  it("counts only regulation (non-SO) goals per side", () => {
    const teamGoals = [{ type: "EVEN" }, { type: "PP" }, { type: "SH" }] as const;
    const opponentGoals = [{ type: "EVEN" }] as const;

    expect(deriveScore([...teamGoals], [...opponentGoals])).toEqual({
      team: 3,
      opponent: 1,
    });
  });

  it("gives the shootout winner one additional goal", () => {
    const teamGoals = [{ type: "EVEN" }, { type: "SO" }, { type: "SO" }] as const;
    const opponentGoals = [{ type: "EVEN" }, { type: "SO" }] as const;

    expect(deriveScore([...teamGoals], [...opponentGoals])).toEqual({
      team: 2,
      opponent: 1,
    });
  });

  it("combines regulation goals from both sides with the shootout decider", () => {
    const teamGoals = [
      { type: "EVEN" },
      { type: "PP" },
      { type: "EN" },
      { type: "SO" },
    ] as const;
    const opponentGoals = [
      { type: "EVEN" },
      { type: "EVEN" },
      { type: "PS" },
      { type: "SO" },
      { type: "SO" },
    ] as const;

    expect(deriveScore([...teamGoals], [...opponentGoals])).toEqual({
      team: 3,
      opponent: 4,
    });
  });
});
