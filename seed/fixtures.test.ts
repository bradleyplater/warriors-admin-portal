import { describe, expect, it } from "vitest";
import { players } from "./data/players";
import { team } from "./data/team";

// The seed data uses the target shape only (docs/03-data-model.md) — the
// legacy aggregate fields were dropped from production in Step 6 of the
// migration plan, so no fixture should carry them.
describe("seed fixtures", () => {
  it("has no legacy player fields", () => {
    for (const player of players) {
      expect(player).not.toHaveProperty("position");
      expect(player).not.toHaveProperty("teams");
      expect(player).not.toHaveProperty("stats");
    }
  });

  it("has no legacy team aggregates", () => {
    expect(team).not.toHaveProperty("players");
    expect(team).not.toHaveProperty("stats");
  });

  it("has unique player ids", () => {
    const ids = players.map((player) => player._id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes an inactive player with no number", () => {
    expect(
      players.some((player) => !player.active && !("number" in player)),
    ).toBe(true);
  });
});
