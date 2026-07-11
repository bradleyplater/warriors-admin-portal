import { z } from "zod";

export const PositionSchema = z.enum(["Forward", "Defence", "Goaltender"]);
export type Position = z.infer<typeof PositionSchema>;

// NIHC is a valid stored value on historical games; restricting it to
// non-selectable on new games is a game-creation form concern (KAN-18),
// not a schema concern.
export const GameTypeSchema = z.enum(["CHALLENGE", "BOTBC", "LLIHC", "NIHC"]);
export type GameType = z.infer<typeof GameTypeSchema>;

export const GoalTypeSchema = z.enum(["EVEN", "PP", "SH", "PS", "EN", "SO"]);
export type GoalType = z.infer<typeof GoalTypeSchema>;

// Extracted from live data (docs/03-data-model.md). HOST's label is marked
// unconfirmed in the doc; shipped as documented per that doc's ownership.
export const PENALTY_CODE_LABELS = {
  TRIP: "Tripping",
  ROUGH: "Roughing",
  CHECK: "Checking",
  CROSS: "Cross-Checking",
  HOOK: "Hooking",
  INTRF: "Interference",
  TOOM: "Too Many Men",
  HOLD: "Holding",
  SLASH: "Slashing",
  BDYCH: "Body Checking",
  HIST: "High Sticking",
  DELAY: "Delay of Game",
  BOARD: "Boarding",
  FIGHT: "Fighting",
  UNSP: "Unsportsmanlike Conduct",
  MISC: "Misconduct",
  MATCH: "Match Penalty",
  ELBOW: "Elbowing",
  ILLEQUIP: "Illegal Equipment",
  CHARG: "Charging",
  KNEE: "Kneeing",
  CHEB: "Checking from Behind",
  AGGR: "Aggressor",
  HOST: "Holding the Stick", // (confirm) — see docs/03-data-model.md
  ABUSE: "Abuse of Officials",
  EMBEL: "Embellishment",
  GOALINTRF: "Goaltender Interference",
  THROWSTICK: "Throwing Stick",
  RETAL: "Retaliation",
} as const satisfies Record<string, string>;

export const PenaltyCodeSchema = z.enum(
  Object.keys(PENALTY_CODE_LABELS) as [string, ...string[]],
);
export type PenaltyCode = z.infer<typeof PenaltyCodeSchema>;
