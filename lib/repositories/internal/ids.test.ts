import { describe, expect, it, vi, afterEach } from "vitest";
import { MongoServerError } from "mongodb";
import {
  generateEmbeddedId,
  generateTopLevelId,
  isDuplicateKeyErrorForField,
} from "./ids";

function duplicateKeyError(keyPattern: Record<string, number>): MongoServerError {
  return new MongoServerError({
    message: "E11000 duplicate key error",
    code: 11000,
    keyPattern,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateEmbeddedId", () => {
  it("returns a PREFIX + 6-digit id", () => {
    const id = generateEmbeddedId("GOL", []);
    expect(id).toMatch(/^GOL\d{6}$/);
  });

  it("retries in-memory when the candidate collides with a sibling id", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.5);
    const id = generateEmbeddedId("GOL", ["GOL000000"]);
    expect(id).toBe("GOL500000");
  });

  it("throws once the retry limit is exhausted", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(() => generateEmbeddedId("GOL", ["GOL000000"], 3)).toThrow(
      /after 3 attempts/,
    );
  });
});

describe("generateTopLevelId", () => {
  it("returns the result of a successful insert on the first attempt", async () => {
    const attemptInsert = vi.fn(async (id: string) => ({ id }));
    const result = await generateTopLevelId("PLR", attemptInsert);
    expect(attemptInsert).toHaveBeenCalledTimes(1);
    expect(result.id).toMatch(/^PLR\d{6}$/);
  });

  it("retries on an _id duplicate-key error", async () => {
    let calls = 0;
    const attemptInsert = vi.fn(async (id: string) => {
      calls += 1;
      if (calls < 3) {
        throw duplicateKeyError({ _id: 1 });
      }
      return { id };
    });
    const result = await generateTopLevelId("PLR", attemptInsert);
    expect(attemptInsert).toHaveBeenCalledTimes(3);
    expect(result.id).toMatch(/^PLR\d{6}$/);
  });

  it("rethrows a non-_id error without retrying", async () => {
    const attemptInsert = vi.fn(async () => {
      throw duplicateKeyError({ number: 1 });
    });
    await expect(generateTopLevelId("PLR", attemptInsert)).rejects.toThrow();
    expect(attemptInsert).toHaveBeenCalledTimes(1);
  });

  it("throws once the retry limit is exhausted", async () => {
    const attemptInsert = vi.fn(async () => {
      throw duplicateKeyError({ _id: 1 });
    });
    await expect(
      generateTopLevelId("PLR", attemptInsert, 3),
    ).rejects.toThrow(/after 3 attempts/);
    expect(attemptInsert).toHaveBeenCalledTimes(3);
  });
});

describe("isDuplicateKeyErrorForField", () => {
  it("returns true when the field is in the error's keyPattern", () => {
    expect(
      isDuplicateKeyErrorForField(duplicateKeyError({ number: 1 }), "number"),
    ).toBe(true);
  });

  it("returns false for a different field", () => {
    expect(
      isDuplicateKeyErrorForField(duplicateKeyError({ _id: 1 }), "number"),
    ).toBe(false);
  });

  it("returns false for a non-MongoServerError", () => {
    expect(isDuplicateKeyErrorForField(new Error("boom"), "number")).toBe(
      false,
    );
  });

  it("returns false for a MongoServerError with a different code", () => {
    const error = duplicateKeyError({ number: 1 });
    error.code = 123;
    expect(isDuplicateKeyErrorForField(error, "number")).toBe(false);
  });
});
