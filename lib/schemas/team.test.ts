import { describe, expect, it } from "vitest";
import { TeamCreateInputSchema, TeamSchema } from "./team";

const validTeam = {
  _id: "TM551420",
  name: "Peterborough Warriors",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TeamSchema", () => {
  it("accepts a valid team", () => {
    expect(TeamSchema.safeParse(validTeam).success).toBe(true);
  });

  it("has no players[] or stats[] fields", () => {
    expect(TeamSchema.shape).not.toHaveProperty("players");
    expect(TeamSchema.shape).not.toHaveProperty("stats");
  });
});

describe("TeamCreateInputSchema", () => {
  it("accepts a payload without _id/createdAt/updatedAt", () => {
    const input = { name: "Peterborough Warriors" };
    expect(TeamCreateInputSchema.safeParse(input).success).toBe(true);
  });
});
