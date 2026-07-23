import { describe, expect, it } from "vitest";
import {
  GameTypeSchema,
  GOAL_TYPE_LABELS,
  GoalTypeSchema,
  PENALTY_CODE_LABELS,
  PenaltyCodeSchema,
  PositionSchema,
} from "./enums";

describe("PositionSchema", () => {
  it.each(["Forward", "Defence", "Goaltender"])("accepts %s", (value) => {
    expect(PositionSchema.safeParse(value).success).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(PositionSchema.safeParse("Winger").success).toBe(false);
  });
});

describe("GameTypeSchema", () => {
  it.each(["CHALLENGE", "BOTBC", "LLIHC", "NIHC"])(
    "accepts %s unconditionally",
    (value) => {
      expect(GameTypeSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects an unknown value", () => {
    expect(GameTypeSchema.safeParse("FRIENDLY").success).toBe(false);
  });
});

describe("GoalTypeSchema", () => {
  it.each(["EVEN", "PP", "SH", "PS", "EN", "SO"])("accepts %s", (value) => {
    expect(GoalTypeSchema.safeParse(value).success).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(GoalTypeSchema.safeParse("OT").success).toBe(false);
  });

  it("has a human-readable label for every documented code", () => {
    expect(GOAL_TYPE_LABELS).toEqual({
      EVEN: "Even Strength",
      PP: "Power Play",
      SH: "Short Handed",
      PS: "Penalty Shot",
      EN: "Empty Net",
      SO: "Shootout",
    });
  });
});

describe("PenaltyCodeSchema", () => {
  it("accepts all 29 documented codes", () => {
    const codes = Object.keys(PENALTY_CODE_LABELS);
    expect(codes).toHaveLength(29);
    for (const code of codes) {
      expect(PenaltyCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it("accepts HOST, shipped with its unconfirmed label", () => {
    expect(PenaltyCodeSchema.safeParse("HOST").success).toBe(true);
    expect(PENALTY_CODE_LABELS.HOST).toBe("Holding the Stick");
  });

  it("rejects an unknown code", () => {
    const result = PenaltyCodeSchema.safeParse("UNKNOWN");
    expect(result.success).toBe(false);
  });
});
