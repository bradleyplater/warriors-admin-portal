import { describe, expect, it } from "vitest";
import { sortNumberReviewPlayers, type NumberReviewPlayer } from "./list";

function player(
  overrides: Partial<NumberReviewPlayer> & { playerId: string },
): NumberReviewPlayer {
  return {
    firstName: "First",
    surname: "Last",
    currentNumber: 134,
    ...overrides,
  };
}

describe("sortNumberReviewPlayers", () => {
  it("orders by current number ascending", () => {
    const players = [
      player({ playerId: "A", currentNumber: 900 }),
      player({ playerId: "B", currentNumber: 101 }),
      player({ playerId: "C", currentNumber: 333 }),
    ];
    expect(sortNumberReviewPlayers(players).map((p) => p.playerId)).toEqual([
      "B",
      "C",
      "A",
    ]);
  });

  it("breaks ties by surname", () => {
    const players = [
      player({ playerId: "A", surname: "Zeta", currentNumber: 101 }),
      player({ playerId: "B", surname: "Alpha", currentNumber: 101 }),
    ];
    expect(sortNumberReviewPlayers(players).map((p) => p.playerId)).toEqual([
      "B",
      "A",
    ]);
  });
});
