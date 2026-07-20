import { describe, expect, it } from "vitest";
import { sortSeasonsAscending } from "./season-order";
import type { Season } from "../schemas";

function season(id: string): Season {
  const name = `${id.slice(3, 5)}/${id.slice(5, 7)}`;
  return { _id: id, name, createdAt: new Date(), updatedAt: new Date() };
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
