import { describe, expect, it } from "vitest";
import { resolveActiveSeason, sortSeasonsAscending } from "./season-order";
import type { Season } from "../schemas";

function season(id: string, active?: boolean): Season {
  const name = `${id.slice(3, 5)}/${id.slice(5, 7)}`;
  return {
    _id: id,
    name,
    ...(active !== undefined && { active }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("sortSeasonsAscending", () => {
  it("sorts unordered seasons ascending by id", () => {
    const seasons = [season("SSN2324"), season("SSN2122"), season("SSN2223")];
    expect(sortSeasonsAscending(seasons).map((s) => s._id)).toEqual([
      "SSN2122",
      "SSN2223",
      "SSN2324",
    ]);
  });

  it("returns an empty array unchanged", () => {
    expect(sortSeasonsAscending([])).toEqual([]);
  });

  it("leaves an already-sorted array in the same order", () => {
    const seasons = [season("SSN2122"), season("SSN2223"), season("SSN2324")];
    expect(sortSeasonsAscending(seasons).map((s) => s._id)).toEqual([
      "SSN2122",
      "SSN2223",
      "SSN2324",
    ]);
  });

  it("does not mutate the input array", () => {
    const seasons = [season("SSN2324"), season("SSN2122")];
    const original = [...seasons];
    sortSeasonsAscending(seasons);
    expect(seasons).toEqual(original);
  });
});

describe("resolveActiveSeason", () => {
  it("picks the flagged season over a newer unflagged one", () => {
    const seasons = [season("SSN2627"), season("SSN2526", true)];
    expect(resolveActiveSeason(seasons)?._id).toBe("SSN2526");
  });

  it("falls back to the newest season when none is flagged", () => {
    const seasons = [season("SSN2526"), season("SSN2425", false)];
    expect(resolveActiveSeason(seasons)?._id).toBe("SSN2526");
  });

  it("picks the newest of several flagged seasons", () => {
    const seasons = [season("SSN2627", true), season("SSN2425", true), season("SSN2728")];
    expect(resolveActiveSeason(seasons)?._id).toBe("SSN2627");
  });

  it("returns null when there are no seasons", () => {
    expect(resolveActiveSeason([])).toBeNull();
  });
});
