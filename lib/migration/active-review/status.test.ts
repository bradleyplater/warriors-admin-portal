import { describe, expect, it } from "vitest";
import { isActiveReviewComplete } from "./status";
import type { ActiveReviewPlayer } from "./list";

function player(active: boolean | undefined): ActiveReviewPlayer {
  return {
    playerId: "PLR000001",
    firstName: "First",
    surname: "Last",
    number: 1,
    active,
    playedCurrentSeason: false,
  };
}

describe("isActiveReviewComplete", () => {
  it("is true when every player has a boolean active value", () => {
    expect(isActiveReviewComplete([player(true), player(false)])).toBe(true);
  });

  it("is false when any player is still unreviewed", () => {
    expect(isActiveReviewComplete([player(true), player(undefined)])).toBe(
      false,
    );
  });

  it("is vacuously true for an empty list", () => {
    expect(isActiveReviewComplete([])).toBe(true);
  });
});
