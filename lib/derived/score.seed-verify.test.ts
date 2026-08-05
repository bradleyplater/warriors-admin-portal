import { describe, expect, it } from "vitest";
import { deriveScore } from "./score";
import { games } from "../../seed/data/games";

// Sanity check against hand-counted totals from seed/data/games.ts — an
// independent oracle for the derivation formulas, not just a self-referential
// test. Each expected value was derived twice, independently, before being
// hardcoded here.
//
// GME100001: team goals EVEN@12 (P1), PP@28 (P2); opponent goal EVEN@40 (P3).
// No SO goals on either side, so totals are the raw regulation counts and
// there's no shootout result.
//
// GME100005: the only seeded game with SO goals. Team: EVEN@8 (P1, regulation)
// + one SO goal (excluded from periods); opponent: EVEN@50 (P3, regulation).
// Team has 1 SO goal to the opponent's 0, so the team wins the shootout and
// gets +1 on top of its 1 regulation goal.
//
// GME100010: team goals EN@58 (P3), EVEN@21 (P2); opponent goal PP@40 (P3).
// No SO goals, so no shootout result.
describe("deriveScore against seeded games (sanity check)", () => {
  it.each([
    [
      "GME100001",
      {
        team: 2,
        opponent: 1,
        periods: [
          { team: 1, opponent: 0 },
          { team: 1, opponent: 0 },
          { team: 0, opponent: 1 },
        ],
        shootout: null,
      },
    ],
    [
      "GME100005",
      {
        team: 2,
        opponent: 1,
        periods: [
          { team: 1, opponent: 0 },
          { team: 0, opponent: 0 },
          { team: 0, opponent: 1 },
        ],
        shootout: { team: 1, opponent: 0 },
      },
    ],
    [
      "GME100010",
      {
        team: 2,
        opponent: 1,
        periods: [
          { team: 0, opponent: 0 },
          { team: 1, opponent: 0 },
          { team: 1, opponent: 1 },
        ],
        shootout: null,
      },
    ],
  ])("%s matches the hand-derived score", (gameId, expected) => {
    const game = games.find((g) => g._id === gameId);
    if (!game) throw new Error(`seed game ${gameId} not found`);

    expect(deriveScore(game.team.goals, game.opponentTeam.goals)).toEqual(
      expected,
    );
  });
});
