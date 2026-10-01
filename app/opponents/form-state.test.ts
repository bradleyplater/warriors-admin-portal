import { describe, expect, it } from "vitest";
import { describeBlockedOpponentDelete } from "./form-state";

describe("describeBlockedOpponentDelete", () => {
  it.each([
    [3, 0, "This opponent is used by 3 games, so it can't be deleted."],
    [1, 0, "This opponent is used by 1 game, so it can't be deleted."],
    [0, 1, "This opponent is used by 1 upcoming game, so it can't be deleted."],
    [2, 2, "This opponent is used by 2 games and 2 upcoming games, so it can't be deleted."],
  ])("games=%i upcoming=%i", (games, upcoming, expected) => {
    expect(describeBlockedOpponentDelete(games, upcoming)).toBe(expected);
  });
});
