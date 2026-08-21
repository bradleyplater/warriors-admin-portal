import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeActiveReviewSaveError } from "./error-messages";
import { DuplicateShirtNumberError } from "@/lib/repositories";

describe("describeActiveReviewSaveError", () => {
  it("returns the message for a shirt number collision", () => {
    const error = new DuplicateShirtNumberError(9);
    expect(describeActiveReviewSaveError(error)).toBe(error.message);
  });

  it("returns a friendly message for an incomplete Step 1 document", () => {
    const error = new z.ZodError([]);
    expect(describeActiveReviewSaveError(error)).toMatch(
      /missing required migration data/,
    );
  });

  it("returns undefined for an unrecognised error", () => {
    expect(describeActiveReviewSaveError(new Error("boom"))).toBeUndefined();
  });
});
