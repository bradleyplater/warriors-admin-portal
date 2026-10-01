import { describe, expect, it } from "vitest";
import { players } from "./data/players";
import { team } from "./data/team";
import { games } from "./data/games";
import { opponents } from "./data/opponents";
import { upcomingGames } from "./data/upcoming-games";
import { OpponentSchema, UpcomingGameSchema } from "../lib/schemas";
import { todayInLondon } from "../lib/upcoming-games/time";

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

  it("has every game reference a seeded opponent, with no free-text name", () => {
    const opponentIds = new Set(opponents.map((opponent) => opponent._id));
    for (const game of games) {
      expect(opponentIds.has(game.opponentTeam.opponentId)).toBe(true);
      expect(game.opponentTeam).not.toHaveProperty("name");
    }
  });

  it("has valid opponents with and without a logo, and one nothing references", () => {
    for (const opponent of opponents) {
      expect(OpponentSchema.safeParse(opponent).success).toBe(true);
    }
    expect(opponents.some((opponent) => opponent.logo)).toBe(true);
    expect(opponents.some((opponent) => !opponent.logo)).toBe(true);
    const referenced = new Set([
      ...games.map((game) => game.opponentTeam.opponentId),
      ...upcomingGames.map((game) => game.opponentId),
    ]);
    expect(opponents.some((opponent) => !referenced.has(opponent._id))).toBe(true);
  });

  it("has valid upcoming games covering home, away, past, and future", () => {
    const opponentIds = new Set(opponents.map((opponent) => opponent._id));
    for (const game of upcomingGames) {
      expect(UpcomingGameSchema.safeParse(game).success).toBe(true);
      expect(opponentIds.has(game.opponentId)).toBe(true);
    }
    const today = todayInLondon();
    expect(upcomingGames.some((game) => game.location === "HOME")).toBe(true);
    expect(upcomingGames.some((game) => game.location === "AWAY")).toBe(true);
    expect(upcomingGames.some((game) => game.date < today)).toBe(true);
    expect(upcomingGames.some((game) => game.date >= today)).toBe(true);
    const logoIds = new Set(opponents.filter((o) => o.logo).map((o) => o._id));
    expect(upcomingGames.some((game) => logoIds.has(game.opponentId))).toBe(true);
  });

  it("has unique opponent ids and names", () => {
    expect(new Set(opponents.map((o) => o._id)).size).toBe(opponents.length);
    expect(new Set(opponents.map((o) => o.name.toLowerCase())).size).toBe(opponents.length);
  });
});
