import { describe, expect, it } from "vitest";
import type { Player } from "@/lib/schemas";
import { photoName, playerLabel, playersForPicker } from "./players";

function player(overrides: Partial<Player>): Player {
  return {
    _id: "PLR000001",
    firstName: "Alex",
    surname: "Smith",
    positions: ["Forward"],
    active: true,
    teamId: "TM000001",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("playerLabel", () => {
  it("leads with the shirt number", () => {
    expect(playerLabel(player({ number: 4 }))).toBe("#4 Alex Smith");
  });

  it("leaves the number out when there isn't one", () => {
    expect(playerLabel(player({ active: false }))).toBe("Alex Smith");
  });
});

describe("playersForPicker", () => {
  it("orders the squad by number and everyone else by surname", () => {
    const { active, inactive } = playersForPicker([
      player({ _id: "A", number: 28 }),
      player({ _id: "B", active: false, surname: "Young" }),
      player({ _id: "C", number: 4 }),
      player({ _id: "D", active: false, surname: "Almond", firstName: "Zed" }),
      player({
        _id: "E",
        active: false,
        surname: "Almond",
        firstName: "Darren",
      }),
    ]);
    expect(active.map((p) => p._id)).toEqual(["C", "A"]);
    expect(inactive.map((p) => p._id)).toEqual(["E", "D", "B"]);
  });
});

describe("photoName", () => {
  it("is the file name within the award's prefix", () => {
    expect(photoName("awards/EVE2526/AWD000001/123-abc.webp")).toBe(
      "123-abc.webp",
    );
  });
});
