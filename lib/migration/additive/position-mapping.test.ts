import { describe, expect, it } from "vitest";
import { mapLegacyPosition } from "./position-mapping";

describe("mapLegacyPosition", () => {
  it.each([
    ["Forward", ["Forward"]],
    ["Defence", ["Defence"]],
    ["Goaltender", ["Goaltender"]],
    ["Forward / Defence", ["Forward", "Defence"]],
    ["Defence / Forward", ["Defence", "Forward"]],
    ["Defence / Goaltender", ["Defence", "Goaltender"]],
    ["Defence/Goaltender", ["Defence", "Goaltender"]],
    ["Goalie / Defence", ["Goaltender", "Defence"]],
  ] as const)("maps %s to %j", (legacy, expected) => {
    expect(mapLegacyPosition(legacy)).toEqual(expected);
  });

  it("throws a descriptive error for an unmapped spelling", () => {
    expect(() => mapLegacyPosition("Wing")).toThrow(
      'Unmapped legacy position spelling: "Wing"',
    );
  });
});
