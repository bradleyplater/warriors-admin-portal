import { describe, expect, it } from "vitest";
import {
  AWARD_CATEGORIES,
  AwardEntrySchema,
  AwardEveningSchema,
  eveningIdForSeason,
} from "./award";

const validEntry = {
  _id: "AWD123456",
  category: "most-goals",
  competition: "BOTBC",
  winners: ["PLR502819"],
};

const validEvening = {
  _id: "EVE2526",
  seasonId: "SSN2526",
  status: "draft",
  entries: [validEntry],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const customEntry = {
  _id: "AWD123456",
  customName: "Knockout of the year",
  winners: ["PLR502819"],
};

function eveningWith(entry: Record<string, unknown>) {
  return { ...validEvening, entries: [{ ...validEntry, ...entry }] };
}

describe("AWARD_CATEGORIES", () => {
  it("gives the stat awards the stat they're decided by", () => {
    expect(AWARD_CATEGORIES["most-goals"].stat).toBe("goals");
    expect(AWARD_CATEGORIES["most-assists"].stat).toBe("assists");
    expect(AWARD_CATEGORIES["most-points"].stat).toBe("points");
  });
});

describe("eveningIdForSeason", () => {
  it("derives the evening id from the season id", () => {
    expect(eveningIdForSeason("SSN2526")).toBe("EVE2526");
  });
});

describe("AwardEntrySchema", () => {
  it("accepts a valid entry", () => {
    expect(AwardEntrySchema.safeParse(validEntry).success).toBe(true);
  });

  it("accepts a custom award with no category", () => {
    expect(AwardEntrySchema.safeParse(customEntry).success).toBe(true);
  });

  it("rejects an entry with neither a category nor a custom name", () => {
    const result = AwardEntrySchema.safeParse({
      _id: "AWD123456",
      winners: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an entry with both a category and a custom name", () => {
    const result = AwardEntrySchema.safeParse({
      ...validEntry,
      customName: "Most goals",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = AwardEntrySchema.safeParse({
      ...validEntry,
      category: "best-hair",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a competition awards aren't split by", () => {
    const result = AwardEntrySchema.safeParse({
      ...validEntry,
      competition: "CHALLENGE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an entry with no winners yet", () => {
    const result = AwardEntrySchema.safeParse({ ...validEntry, winners: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a shared award", () => {
    const result = AwardEntrySchema.safeParse({
      ...validEntry,
      winners: ["PLR006500", "PLR123881"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts hideTotal only as true", () => {
    expect(
      AwardEntrySchema.safeParse({ ...validEntry, hideTotal: true }).success,
    ).toBe(true);
    expect(
      AwardEntrySchema.safeParse({ ...validEntry, hideTotal: false }).success,
    ).toBe(false);
  });

  it("accepts hideTotal only as true", () => {
    expect(
      AwardEntrySchema.safeParse({ ...validEntry, hideTotal: true }).success,
    ).toBe(true);
    expect(
      AwardEntrySchema.safeParse({ ...validEntry, hideTotal: false }).success,
    ).toBe(false);
  });

  it("rejects the same winner twice", () => {
    const result = AwardEntrySchema.safeParse({
      ...validEntry,
      winners: ["PLR502819", "PLR502819"],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["winners"]);
  });

  it("rejects a custom name over the length limit", () => {
    const result = AwardEntrySchema.safeParse({
      ...customEntry,
      customName: "x".repeat(121),
    });
    expect(result.success).toBe(false);
  });
});

describe("AwardEveningSchema", () => {
  it("accepts a valid evening", () => {
    expect(AwardEveningSchema.safeParse(validEvening).success).toBe(true);
  });

  it("rejects a malformed _id", () => {
    const result = AwardEveningSchema.safeParse({
      ...validEvening,
      _id: "SSN2526",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an id/season mismatch", () => {
    const result = AwardEveningSchema.safeParse({
      ...validEvening,
      seasonId: "SSN2425",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["seasonId"]);
  });

  it("rejects an unknown status", () => {
    const result = AwardEveningSchema.safeParse({
      ...validEvening,
      status: "live",
    });
    expect(result.success).toBe(false);
  });

  it("rejects two entries with the same id", () => {
    const result = AwardEveningSchema.safeParse({
      ...validEvening,
      entries: [validEntry, { ...validEntry, competition: "LLIHC" }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["entries", 1, "_id"]);
  });

  it("accepts a photo under the entry's own prefix", () => {
    const result = AwardEveningSchema.safeParse(
      eveningWith({
        photo: { key: "awards/EVE2526/AWD123456/1761998400000.webp" },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a photo under another entry's prefix", () => {
    const result = AwardEveningSchema.safeParse(
      eveningWith({
        photo: { key: "awards/EVE2526/AWD999999/1761998400000.webp" },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "entries",
      0,
      "photo",
      "key",
    ]);
  });

  it("rejects a photo that isn't a .webp", () => {
    const result = AwardEveningSchema.safeParse(
      eveningWith({ photo: { key: "awards/EVE2526/AWD123456/photo.jpg" } }),
    );
    expect(result.success).toBe(false);
  });
});
