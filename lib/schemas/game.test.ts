import { describe, expect, it } from "vitest";
import { GameCreateInputSchema, GameSchema } from "./game";

interface GoalFixture {
  _id: string;
  scoredBy: string;
  assist1?: string;
  assist2?: string;
  minute: number;
  second: number;
  type: string;
}

interface PenaltyFixture {
  _id: string;
  offender: string;
  minute: number;
  second: number;
  type: string;
  duration: number;
}

interface GameFixture {
  _id: string;
  date: Date;
  seasonId: string;
  type: string;
  location: string;
  team: {
    id: string;
    roster: { playerId: string }[];
    goals: GoalFixture[];
    penalties: PenaltyFixture[];
  };
  opponentTeam: {
    name: string;
    goals: {
      _id: string;
      scoredBy: string;
      minute: number;
      second: number;
      type: string;
    }[];
    penalties: {
      _id: string;
      offender: string;
      minute: number;
      second: number;
      type: string;
      duration: number;
    }[];
  };
  netminderPlayerId?: string;
  manOfTheMatchPlayerId?: string;
  warriorOfTheGamePlayerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

function baseGame(): GameFixture {
  return {
    _id: "GME221248",
    date: new Date("2026-01-10"),
    seasonId: "SSN2526",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR000001" }, { playerId: "PLR000002" }],
      goals: [
        {
          _id: "GOL000001",
          scoredBy: "PLR000001",
          assist1: "PLR000002",
          minute: 12,
          second: 30,
          type: "EVEN",
        },
      ],
      penalties: [
        {
          _id: "PEN000001",
          offender: "BENCH",
          minute: 5,
          second: 0,
          type: "TRIP",
          duration: 2,
        },
      ],
    },
    opponentTeam: {
      name: "Rival Team",
      goals: [
        {
          _id: "OGL000001",
          scoredBy: "J. Rival",
          minute: 8,
          second: 15,
          type: "EVEN",
        },
      ],
      penalties: [
        {
          _id: "OPP000001",
          offender: "J. Rival",
          minute: 20,
          second: 0,
          type: "HOOK",
          duration: 2,
        },
      ],
    },
    netminderPlayerId: "PLR000001",
    manOfTheMatchPlayerId: "PLR000002",
    warriorOfTheGamePlayerId: "PLR000001",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("GameSchema", () => {
  it("accepts a fully valid game", () => {
    expect(GameSchema.safeParse(baseGame()).success).toBe(true);
  });

  it("rejects a goal scorer not on the roster", () => {
    const game = baseGame();
    game.team.goals[0].scoredBy = "PLR999999";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects an assist equal to the scorer", () => {
    const game = baseGame();
    game.team.goals[0].assist1 = game.team.goals[0].scoredBy;
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects duplicate assists", () => {
    const game = baseGame();
    game.team.goals[0].assist1 = "PLR000002";
    game.team.goals[0].assist2 = "PLR000002";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects assist2 without assist1", () => {
    const game = baseGame();
    game.team.goals[0].assist1 = undefined;
    game.team.goals[0].assist2 = "PLR000002";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects an assist not on the roster", () => {
    const game = baseGame();
    game.team.goals[0].assist1 = "PLR999999";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it.each([-1, 60])("rejects a second value of %d", (second) => {
    const game = baseGame();
    game.team.goals[0].second = second;
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects a non-shootout goal outside game length", () => {
    const game = baseGame();
    game.team.goals[0].minute = 65;
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("accepts a shootout goal outside game length", () => {
    const game = baseGame();
    game.team.goals[0].minute = 65;
    game.team.goals[0].type = "SO";
    expect(GameSchema.safeParse(game).success).toBe(true);
  });

  it("rejects a non-positive penalty duration", () => {
    const game = baseGame();
    game.team.penalties[0].duration = 0;
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("accepts BENCH as a penalty offender", () => {
    const game = baseGame();
    game.team.penalties[0].offender = "BENCH";
    expect(GameSchema.safeParse(game).success).toBe(true);
  });

  it("rejects a penalty offender that is neither rostered nor BENCH", () => {
    const game = baseGame();
    game.team.penalties[0].offender = "PLR999999";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects a netminder not on the roster", () => {
    const game = baseGame();
    game.netminderPlayerId = "PLR999999";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects a Player of the Game not on the roster", () => {
    const game = baseGame();
    game.manOfTheMatchPlayerId = "PLR999999";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects a Warrior of the Game not on the roster", () => {
    const game = baseGame();
    game.warriorOfTheGamePlayerId = "PLR999999";
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("rejects duplicate roster entries", () => {
    const game = baseGame();
    game.team.roster.push({ playerId: "PLR000001" });
    expect(GameSchema.safeParse(game).success).toBe(false);
  });

  it("accepts free-text opponent goal scorer and penalty offender", () => {
    const game = baseGame();
    game.opponentTeam.goals[0].scoredBy = "Anyone At All";
    game.opponentTeam.penalties[0].offender = "Anyone At All";
    expect(GameSchema.safeParse(game).success).toBe(true);
  });
});

describe("GameCreateInputSchema", () => {
  it("accepts a payload without generated ids/timestamps", () => {
    const input = {
      date: new Date("2026-01-10"),
      seasonId: "SSN2526",
      type: "CHALLENGE",
      location: "HOME",
      team: {
        id: "TM551420",
        roster: [{ playerId: "PLR000001" }, { playerId: "PLR000002" }],
        goals: [
          {
            scoredBy: "PLR000001",
            assist1: "PLR000002",
            minute: 12,
            second: 30,
            type: "EVEN",
          },
        ],
        penalties: [],
      },
      opponentTeam: {
        name: "Rival Team",
        goals: [],
        penalties: [],
      },
    };
    expect(GameCreateInputSchema.safeParse(input).success).toBe(true);
  });

  it("still enforces roster-membership rules without generated ids", () => {
    const input = {
      date: new Date("2026-01-10"),
      seasonId: "SSN2526",
      type: "CHALLENGE",
      location: "HOME",
      team: {
        id: "TM551420",
        roster: [{ playerId: "PLR000001" }],
        goals: [
          {
            scoredBy: "PLR999999",
            minute: 12,
            second: 30,
            type: "EVEN",
          },
        ],
        penalties: [],
      },
      opponentTeam: {
        name: "Rival Team",
        goals: [],
        penalties: [],
      },
    };
    expect(GameCreateInputSchema.safeParse(input).success).toBe(false);
  });
});
