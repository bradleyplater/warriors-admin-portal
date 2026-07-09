// Local, seed-only types mirroring docs/03-data-model.md's target shapes,
// plus the legacy fields needed for migration/reconciliation drift fixtures.
// Not shared with application code — KAN-13 owns the real schema layer.

export type Position = "Forward" | "Defence" | "Goaltender";

export type GameType = "CHALLENGE" | "BOTBC" | "LLIHC" | "NIHC";

export type GoalType = "EVEN" | "PP" | "SH" | "PS" | "EN" | "SO";

export type PenaltyCode =
  | "TRIP"
  | "ROUGH"
  | "CHECK"
  | "CROSS"
  | "HOOK"
  | "INTRF"
  | "TOOM"
  | "HOLD"
  | "SLASH"
  | "BOARD"
  | "FIGHT";

export interface Season {
  _id: string; // "SSN2526"
  name: string; // "25/26"
  createdAt: Date;
  updatedAt: Date;
}

// Legacy per-season stats line as it lived on Team.stats[] / Player.stats[]
// before it was derived from Game documents.
export interface LegacyStatsLine {
  seasonId: string;
  goals: number;
  assists: number;
  pims: number;
}

export interface Team {
  _id: string; // "TM551420"
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // Legacy aggregate fields — removed in the target shape, kept here only
  // so the seed dataset can carry deliberately drifted values for the
  // reconciliation report (KAN-37) to detect.
  players?: Array<{ playerId: string; number: number }>;
  stats?: LegacyStatsLine[];
}

export interface Player {
  _id: string; // "PLR502819"
  firstName: string;
  surname: string;
  number: number; // 1-99 for active players; legacy fixtures may exceed this
  positions: Position[];
  active: boolean;
  nickname?: string;
  imageUrl?: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
  // Legacy fields — present only on drift fixtures used for migration testing.
  position?: string; // old free-text spelling, e.g. "Goalie / Defence"
  teams?: Array<{ teamId: string; number: number }>;
  stats?: LegacyStatsLine[];
}

export interface Goal {
  _id: string; // "GOL######"
  scoredBy: string; // playerId, must be in roster
  assist1?: string;
  assist2?: string;
  minute: number;
  second: number;
  type: GoalType;
}

export interface Penalty {
  _id: string; // "PEN######"
  offender: string; // playerId in roster, or "BENCH"
  minute: number;
  second: number;
  type: PenaltyCode;
  duration: number;
}

export interface OpponentGoal {
  _id: string; // "OGL######"
  scoredBy: string; // free-text name
  minute: number;
  second: number;
  type: GoalType;
}

export interface OpponentPenalty {
  _id: string; // "OPP######"
  offender: string; // free-text name
  minute: number;
  second: number;
  type: PenaltyCode;
  duration: number;
}

export interface Game {
  _id: string; // "GME221248"
  date: Date;
  seasonId: string;
  type: GameType;
  location: "HOME" | "AWAY";
  team: {
    id: string;
    roster: Array<{ playerId: string }>;
    goals: Goal[];
    penalties: Penalty[];
  };
  opponentTeam: {
    name: string;
    goals: OpponentGoal[];
    penalties: OpponentPenalty[];
  };
  netminderPlayerId?: string;
  manOfTheMatchPlayerId?: string;
  warriorOfTheGamePlayerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
