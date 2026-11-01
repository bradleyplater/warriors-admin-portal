import { describe, expect, it } from "vitest";
import { AwardEntrySchema } from "../schemas";
import { standardAwardEntries } from "./standard-set";

describe("standardAwardEntries", () => {
  const entries = standardAwardEntries();

  it("gives each competition its own MVP, BOTB first", () => {
    expect(entries.filter((entry) => entry.category === "mvp")).toEqual([
      { category: "mvp", competition: "BOTBC", winners: [] },
      { category: "mvp", competition: "LLIHC", winners: [] },
    ]);
  });

  it("gives the coaches' and manager's honours once, club-wide", () => {
    expect(entries.slice(-2)).toEqual([
      { category: "coaches-player", winners: [] },
      { category: "managers-player", winners: [] },
    ]);
  });

  it("matches the design's 11 awards per competition plus 2 honours", () => {
    expect(entries).toHaveLength(24);
  });

  it("leaves out awards the design doesn't give this season", () => {
    const categories = new Set(entries.map((entry) => entry.category));
    expect(categories.has("captain")).toBe(false);
    expect(categories.has("best-goalie")).toBe(false);
  });

  it("returns valid entries with no winners", () => {
    for (const entry of entries) {
      expect(
        AwardEntrySchema.safeParse({ _id: "AWD000000", ...entry }).success,
      ).toBe(true);
      expect(entry.winners).toEqual([]);
    }
  });

  it("returns fresh arrays each call", () => {
    standardAwardEntries()[0]!.winners.push("PLR000001");
    expect(standardAwardEntries()[0]!.winners).toEqual([]);
  });
});
