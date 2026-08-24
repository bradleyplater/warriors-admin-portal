import { describe, expect, it } from "vitest";
import { compareByShirtNumber } from "./player-order";

describe("compareByShirtNumber", () => {
  it("orders ascending by number", () => {
    const players = [{ number: 30 }, { number: 5 }, { number: 12 }];
    expect(players.sort(compareByShirtNumber).map((p) => p.number)).toEqual([
      5, 12, 30,
    ]);
  });

  it("sorts players with no number last", () => {
    const players = [{ number: undefined }, { number: 5 }, { number: undefined }];
    expect(players.sort(compareByShirtNumber).map((p) => p.number)).toEqual([
      5,
      undefined,
      undefined,
    ]);
  });
});
