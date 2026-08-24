import { describe, expect, it } from "vitest";
import { isNumberReviewComplete } from "./status";
import type { NumberReviewPlayer } from "./list";

function player(overrides: Partial<NumberReviewPlayer> = {}): NumberReviewPlayer {
  return {
    playerId: "PLR000001",
    firstName: "First",
    surname: "Last",
    currentNumber: 134,
    ...overrides,
  };
}

describe("isNumberReviewComplete", () => {
  it("is vacuously true for an empty list", () => {
    expect(isNumberReviewComplete([])).toBe(true);
  });

  it("is false when any player is still listed", () => {
    expect(isNumberReviewComplete([player()])).toBe(false);
  });
});
