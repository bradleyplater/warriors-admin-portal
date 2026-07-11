import { z } from "zod";
import { GameTypeSchema, GoalTypeSchema, PenaltyCodeSchema } from "./enums";

const SecondSchema = z
  .number()
  .int()
  .min(0, "Second must be between 0 and 59")
  .max(59, "Second must be between 0 and 59");

interface GoalLike {
  scoredBy: string;
  assist1?: string;
  assist2?: string;
  minute: number;
  type: string;
}

// Single-document rules from docs/03-data-model.md's Goals validation bullet.
// Roster membership is NOT checked here — it needs the sibling roster array,
// so it lives in checkGameRefs below.
function checkGoalRules(goal: GoalLike, ctx: z.RefinementCtx) {
  if (goal.assist1 !== undefined && goal.assist1 === goal.scoredBy) {
    ctx.addIssue({
      code: "custom",
      message: "Assist cannot be the same player as the scorer",
      path: ["assist1"],
    });
  }
  if (goal.assist2 !== undefined && goal.assist2 === goal.scoredBy) {
    ctx.addIssue({
      code: "custom",
      message: "Assist cannot be the same player as the scorer",
      path: ["assist2"],
    });
  }
  if (goal.assist2 !== undefined && goal.assist2 === goal.assist1) {
    ctx.addIssue({
      code: "custom",
      message: "Assists must be two different players",
      path: ["assist2"],
    });
  }
  if (goal.assist2 !== undefined && goal.assist1 === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "assist2 requires assist1 to be set",
      path: ["assist2"],
    });
  }
  if (goal.type !== "SO" && (goal.minute < 0 || goal.minute > 59)) {
    ctx.addIssue({
      code: "custom",
      message:
        "Minute must be within game length (0-59) for non-shootout goals",
      path: ["minute"],
    });
  }
}

const GoalBaseShape = {
  scoredBy: z.string(), // playerId — checked against roster at the Game level
  assist1: z.string().optional(),
  assist2: z.string().optional(),
  minute: z.number().int().min(0),
  second: SecondSchema,
  type: GoalTypeSchema,
};

const GoalShape = z.object({ _id: z.string(), ...GoalBaseShape }); // "GOL######"
export const GoalSchema = GoalShape.superRefine(checkGoalRules);
export type Goal = z.infer<typeof GoalSchema>;

export const GoalCreateInputSchema = z
  .object(GoalBaseShape)
  .superRefine(checkGoalRules);
export type GoalCreateInput = z.infer<typeof GoalCreateInputSchema>;

const PenaltyBaseShape = {
  offender: z.string(), // playerId in roster, or "BENCH" — checked at Game level
  minute: z.number().int().min(0),
  second: SecondSchema,
  type: PenaltyCodeSchema,
  duration: z.number().positive("Duration must be greater than 0"),
};

const PenaltyShape = z.object({ _id: z.string(), ...PenaltyBaseShape }); // "PEN######"
export const PenaltySchema = PenaltyShape;
export type Penalty = z.infer<typeof PenaltySchema>;

export const PenaltyCreateInputSchema = z.object(PenaltyBaseShape);
export type PenaltyCreateInput = z.infer<typeof PenaltyCreateInputSchema>;

const OpponentGoalBaseShape = {
  scoredBy: z.string().min(1), // free-text name
  minute: z.number().int().min(0),
  second: SecondSchema,
  type: GoalTypeSchema,
};
const OpponentGoalShape = z.object({
  _id: z.string(), // "OGL######"
  ...OpponentGoalBaseShape,
});
export const OpponentGoalSchema = OpponentGoalShape;
export type OpponentGoal = z.infer<typeof OpponentGoalSchema>;

export const OpponentGoalCreateInputSchema = z.object(OpponentGoalBaseShape);
export type OpponentGoalCreateInput = z.infer<
  typeof OpponentGoalCreateInputSchema
>;

const OpponentPenaltyBaseShape = {
  offender: z.string().min(1), // free-text name
  minute: z.number().int().min(0),
  second: SecondSchema,
  type: PenaltyCodeSchema,
  duration: z.number().positive("Duration must be greater than 0"),
};
const OpponentPenaltyShape = z.object({
  _id: z.string(), // "OPP######"
  ...OpponentPenaltyBaseShape,
});
export const OpponentPenaltySchema = OpponentPenaltyShape;
export type OpponentPenalty = z.infer<typeof OpponentPenaltySchema>;

export const OpponentPenaltyCreateInputSchema = z.object(
  OpponentPenaltyBaseShape,
);
export type OpponentPenaltyCreateInput = z.infer<
  typeof OpponentPenaltyCreateInputSchema
>;

const RosterEntrySchema = z.object({ playerId: z.string() });

interface GameLike {
  team: {
    roster: { playerId: string }[];
    goals: GoalLike[];
    penalties: { offender: string }[];
  };
  netminderPlayerId?: string;
  manOfTheMatchPlayerId?: string;
  warriorOfTheGamePlayerId?: string;
}

const AWARD_FIELDS = [
  "netminderPlayerId",
  "manOfTheMatchPlayerId",
  "warriorOfTheGamePlayerId",
] as const;

// Cross-field-but-same-document rules: roster is a sibling of goals/
// penalties/awards within one Game document, so this can all be checked
// without a DB round trip. Existence of the roster's players, and blocking
// removal of a referenced player, DO need the DB — those are out of scope
// here (KAN-14 / service layer).
function checkGameRefs(game: GameLike, ctx: z.RefinementCtx) {
  const rosterIds = new Set<string>();
  game.team.roster.forEach((entry, index) => {
    if (rosterIds.has(entry.playerId)) {
      ctx.addIssue({
        code: "custom",
        message: "Roster cannot contain duplicate players",
        path: ["team", "roster", index, "playerId"],
      });
    }
    rosterIds.add(entry.playerId);
  });

  const isRostered = (playerId: string) => rosterIds.has(playerId);

  game.team.goals.forEach((goal, index) => {
    if (!isRostered(goal.scoredBy)) {
      ctx.addIssue({
        code: "custom",
        message: "Scorer must be on the roster",
        path: ["team", "goals", index, "scoredBy"],
      });
    }
    if (goal.assist1 !== undefined && !isRostered(goal.assist1)) {
      ctx.addIssue({
        code: "custom",
        message: "Assist must be on the roster",
        path: ["team", "goals", index, "assist1"],
      });
    }
    if (goal.assist2 !== undefined && !isRostered(goal.assist2)) {
      ctx.addIssue({
        code: "custom",
        message: "Assist must be on the roster",
        path: ["team", "goals", index, "assist2"],
      });
    }
  });

  game.team.penalties.forEach((penalty, index) => {
    if (penalty.offender !== "BENCH" && !isRostered(penalty.offender)) {
      ctx.addIssue({
        code: "custom",
        message: 'Penalty offender must be on the roster or "BENCH"',
        path: ["team", "penalties", index, "offender"],
      });
    }
  });

  for (const field of AWARD_FIELDS) {
    const playerId = game[field];
    if (playerId !== undefined && !isRostered(playerId)) {
      ctx.addIssue({
        code: "custom",
        message: "Must be on the roster",
        path: [field],
      });
    }
  }
}

const GameBaseShape = {
  date: z.date(),
  seasonId: z.string(),
  type: GameTypeSchema,
  location: z.enum(["HOME", "AWAY"]),
  netminderPlayerId: z.string().optional(),
  manOfTheMatchPlayerId: z.string().optional(),
  warriorOfTheGamePlayerId: z.string().optional(),
};

const GameShape = z.object({
  _id: z.string(), // "GME######"
  ...GameBaseShape,
  team: z.object({
    id: z.string(),
    roster: z.array(RosterEntrySchema),
    goals: z.array(GoalSchema),
    penalties: z.array(PenaltySchema),
  }),
  opponentTeam: z.object({
    name: z.string().min(1),
    goals: z.array(OpponentGoalSchema),
    penalties: z.array(OpponentPenaltySchema),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const GameSchema = GameShape.superRefine(checkGameRefs);
export type Game = z.infer<typeof GameSchema>;

const GameCreateInputShape = z.object({
  ...GameBaseShape,
  team: z.object({
    id: z.string(),
    roster: z.array(RosterEntrySchema),
    goals: z.array(GoalCreateInputSchema),
    penalties: z.array(PenaltyCreateInputSchema),
  }),
  opponentTeam: z.object({
    name: z.string().min(1),
    goals: z.array(OpponentGoalCreateInputSchema),
    penalties: z.array(OpponentPenaltyCreateInputSchema),
  }),
});

export const GameCreateInputSchema =
  GameCreateInputShape.superRefine(checkGameRefs);
export type GameCreateInput = z.infer<typeof GameCreateInputSchema>;
