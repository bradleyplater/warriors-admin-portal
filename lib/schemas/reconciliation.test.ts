import { describe, expect, it } from "vitest";
import {
  ReconciliationResolutionCreateInputSchema,
  ReconciliationResolutionSchema,
} from "./reconciliation";

const validResolution = {
  _id: "RCN000001",
  mismatchKey: "player-stats:PLR562272:SSN2425:gamesPlayed:teamCopy",
  dimension: "player-stats",
  entityId: "PLR562272",
  field: "gamesPlayed",
  storedValue: 9,
  computedValue: 10,
  resolvedAt: new Date("2026-08-24T00:00:00Z"),
};

describe("ReconciliationResolutionSchema", () => {
  it("accepts a valid resolution record", () => {
    expect(ReconciliationResolutionSchema.safeParse(validResolution).success).toBe(
      true,
    );
  });

  it.each(["player-stats", "team-stats", "game-score"])(
    "accepts dimension %s",
    (dimension) => {
      const result = ReconciliationResolutionSchema.safeParse({
        ...validResolution,
        dimension,
      });
      expect(result.success).toBe(true);
    },
  );

  it("rejects an unrecognised dimension", () => {
    const result = ReconciliationResolutionSchema.safeParse({
      ...validResolution,
      dimension: "player-position",
    });
    expect(result.success).toBe(false);
  });
});

describe("ReconciliationResolutionCreateInputSchema", () => {
  it("accepts a payload without _id", () => {
    const { _id: _omit, ...input } = validResolution;
    expect(
      ReconciliationResolutionCreateInputSchema.safeParse(input).success,
    ).toBe(true);
  });
});
