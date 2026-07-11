import { describe, expect, it } from "vitest";
import { SeasonCreateInputSchema, SeasonSchema } from "./season";

const validSeason = {
  _id: "SSN2526",
  name: "25/26",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("SeasonSchema", () => {
  it("accepts a valid season", () => {
    expect(SeasonSchema.safeParse(validSeason).success).toBe(true);
  });

  it("rejects a malformed _id", () => {
    const result = SeasonSchema.safeParse({ ...validSeason, _id: "2526" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed name", () => {
    const result = SeasonSchema.safeParse({
      ...validSeason,
      name: "2025/26",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an id/name mismatch", () => {
    const result = SeasonSchema.safeParse({ ...validSeason, name: "24/25" });
    expect(result.success).toBe(false);
  });
});

describe("SeasonCreateInputSchema", () => {
  it("accepts a payload without _id/createdAt/updatedAt", () => {
    const input = { name: "25/26" };
    expect(SeasonCreateInputSchema.safeParse(input).success).toBe(true);
  });
});
