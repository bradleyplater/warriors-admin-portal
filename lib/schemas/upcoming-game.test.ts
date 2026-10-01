import { describe, expect, it } from "vitest";
import {
  UpcomingGameCreateInputSchema,
  UpcomingGameSchema,
} from "./upcoming-game";

function baseGame() {
  return {
    _id: "UPG123456",
    opponentId: "OPN123456",
    date: "2026-10-03",
    time: "20:30",
    location: "HOME",
    type: "CHALLENGE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("UpcomingGameSchema", () => {
  it("accepts a home game without a venue", () => {
    expect(UpcomingGameSchema.safeParse(baseGame()).success).toBe(true);
  });

  it("accepts an away game with a venue, trimming it", () => {
    const result = UpcomingGameSchema.parse({
      ...baseGame(),
      location: "AWAY",
      venue: "  Riverside Leisure Centre ",
    });
    expect(result.venue).toBe("Riverside Leisure Centre");
  });

  it.each([undefined, "", "   "])("rejects an away game with venue %j", (venue) => {
    const result = UpcomingGameSchema.safeParse({
      ...baseGame(),
      location: "AWAY",
      venue,
    });
    expect(issuePaths(result)).toContain("venue");
  });

  it("rejects a home game with a venue", () => {
    const result = UpcomingGameSchema.safeParse({ ...baseGame(), venue: "Somewhere" });
    expect(issuePaths(result)).toContain("venue");
  });

  it.each(["2026-02-30", "2026-13-01", "03/10/2026", ""])("rejects date %j", (date) => {
    const result = UpcomingGameSchema.safeParse({ ...baseGame(), date });
    expect(issuePaths(result)).toContain("date");
  });

  it("accepts a leap day", () => {
    expect(UpcomingGameSchema.safeParse({ ...baseGame(), date: "2028-02-29" }).success).toBe(true);
  });

  it.each(["25:00", "20:60", "8:30", ""])("rejects time %j", (time) => {
    const result = UpcomingGameSchema.safeParse({ ...baseGame(), time });
    expect(issuePaths(result)).toContain("time");
  });

  it.each(["CHALLENGE", "LLIHC", "BOTBC"])("accepts type %s", (type) => {
    expect(UpcomingGameSchema.safeParse({ ...baseGame(), type }).success).toBe(true);
  });

  it("rejects NIHC", () => {
    const result = UpcomingGameSchema.safeParse({ ...baseGame(), type: "NIHC" });
    expect(issuePaths(result)).toContain("type");
  });

  it("rejects a malformed id", () => {
    const result = UpcomingGameSchema.safeParse({ ...baseGame(), _id: "UPC123456" });
    expect(issuePaths(result)).toContain("_id");
  });

  it("rejects a malformed opponent id", () => {
    const result = UpcomingGameSchema.safeParse({ ...baseGame(), opponentId: "" });
    expect(issuePaths(result)).toContain("opponentId");
  });
});

describe("UpcomingGameCreateInputSchema", () => {
  it("accepts a payload without _id/createdAt/updatedAt", () => {
    const { _id, createdAt, updatedAt, ...input } = baseGame();
    void _id;
    void createdAt;
    void updatedAt;
    expect(UpcomingGameCreateInputSchema.safeParse(input).success).toBe(true);
  });

  it("applies the venue rule", () => {
    const result = UpcomingGameCreateInputSchema.safeParse({
      opponentId: "OPN123456",
      date: "2026-10-03",
      time: "20:30",
      location: "AWAY",
      type: "LLIHC",
    });
    expect(issuePaths(result)).toContain("venue");
  });
});
