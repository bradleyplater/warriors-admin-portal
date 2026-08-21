import { describe, expect, it } from "vitest";
import { serializeDocuments, deserializeDocuments } from "./ejson";

describe("serializeDocuments / deserializeDocuments", () => {
  it("round-trips a Date field as a real Date, not a string", () => {
    const original = [
      { _id: "PLR000001", name: "Test Player", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ];

    const restored = deserializeDocuments(serializeDocuments(original));

    expect(restored[0]!.createdAt).toBeInstanceOf(Date);
    expect((restored[0]!.createdAt as Date).getTime()).toBe(original[0]!.createdAt.getTime());
  });

  it("round-trips nested documents and arrays unchanged", () => {
    const original = [
      {
        _id: "GME000001",
        goals: [{ scorer: "PLR000001", assist1: null, time: "12:34" }],
        team: { roster: ["PLR000001", "PLR000002"] },
      },
    ];

    const restored = deserializeDocuments(serializeDocuments(original));

    expect(restored).toEqual(original);
  });

  it("round-trips an empty document list", () => {
    expect(deserializeDocuments(serializeDocuments([]))).toEqual([]);
  });
});
