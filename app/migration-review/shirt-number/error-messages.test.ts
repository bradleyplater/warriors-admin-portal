import { z } from "zod";
import { describe, expect, it } from "vitest";
import { describeNumberReviewSaveError } from "./error-messages";
import { DuplicateShirtNumberError } from "@/lib/repositories";

describe("describeNumberReviewSaveError", () => {
  it("returns the error message for a shirt-number collision", () => {
    const error = new DuplicateShirtNumberError(42);
    expect(describeNumberReviewSaveError(error)).toBe(error.message);
  });

  it("returns a friendly message for an incomplete-migration ZodError", () => {
    const error = new z.ZodError([]);
    expect(describeNumberReviewSaveError(error)).toMatch(
      /missing required migration data/,
    );
  });

  it("returns undefined for an unrecognised error", () => {
    expect(describeNumberReviewSaveError(new Error("boom"))).toBeUndefined();
  });
});
