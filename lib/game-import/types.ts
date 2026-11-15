import type {
  Game,
  GameCreateInput,
  GoalType,
  Opponent,
  PenaltyCode,
  Player,
  Season,
  Team,
} from "../schemas";

export const IMPORTABLE_GAME_TYPES = ["CHALLENGE", "BOTBC", "LLIHC"] as const;
export type ImportableGameType = (typeof IMPORTABLE_GAME_TYPES)[number];

// The portal data an import is matched against. Pick<> keeps the resolver
// testable with hand-built objects.
export interface PortalContext {
  team: Pick<Team, "_id" | "name">;
  players: Pick<
    Player,
    "_id" | "firstName" | "surname" | "number" | "active"
  >[];
  opponents: Pick<Opponent, "_id" | "name">[];
  seasons: Pick<Season, "_id" | "name" | "active">[];
  games: (Pick<Game, "_id" | "date"> & {
    opponentTeam: Pick<Game["opponentTeam"], "opponentId">;
  })[];
}

// Everything the admin chose in the preview. The client only ever sends
// these plus the CSV text — never a built game (design D5).
export interface ImportResolutions {
  warriorsSide?: "HOME" | "AWAY";
  opponentId?: string;
  seasonId?: string;
  gameType?: ImportableGameType;
  date?: string; // YYYY-MM-DD
  players?: Record<string, string>; // sheet shirt number → playerId
  goalTypes?: Record<string, GoalType>; // eventKey → goal type
  penaltyCodes?: Record<string, PenaltyCode>; // eventKey → penalty code
}

export type ImportSide = "team" | "opponent";

// "goal:team:3", "penalty:opponent:0" — identifies one event row so the
// admin's choice for it survives a re-preview.
export const eventKey = (
  kind: "goal" | "penalty",
  side: ImportSide,
  index: number,
) => `${kind}:${side}:${index}`;

// A blocking problem. `target` says what the UI should highlight:
// "detail:<field>", "player:<number>", or "<eventKey>:<field>".
export interface ImportFlag {
  target: string;
  message: string;
}

export interface ImportWarning {
  message: string;
  gameId?: string; // set on the duplicate-game warning, for its link
}

export interface PreviewPlayer {
  number: string;
  sheetName: string; // "" for a number only seen in the event rows
  listed: boolean;
  playerId: string | null;
  status: "matched" | "resolved" | "flagged";
  suggestedPlayerId: string | null;
}

export interface PreviewTime {
  text: string;
  minute: number | null;
  second: number | null;
}

export interface PreviewGoal {
  key: string;
  time: PreviewTime;
  sheetType: string;
  type: GoalType | null;
  scorer: string; // Warriors: shirt number; opponent: display name
  assists: string[]; // Warriors only: shirt numbers
}

export interface PreviewPenalty {
  key: string;
  time: PreviewTime;
  sheetOffence: string;
  code: PenaltyCode | null;
  offender: string; // Warriors: shirt number or "BENCH"; opponent: name
  duration: number | null;
}

export interface ImportPreview {
  details: {
    homeTeam: string;
    awayTeam: string;
    sheetDate: string;
    competition: string;
    warriorsSide: "HOME" | "AWAY" | null;
    opponentSheetName: string;
    opponentId: string | null;
    date: string | null; // YYYY-MM-DD
    seasonId: string | null;
    gameType: ImportableGameType | null;
  };
  players: PreviewPlayer[];
  goals: PreviewGoal[];
  penalties: PreviewPenalty[];
  opponentGoals: PreviewGoal[];
  opponentPenalties: PreviewPenalty[];
  flags: ImportFlag[];
  warnings: ImportWarning[];
  // Present only when there are no flags; this is what gets saved.
  input: GameCreateInput | null;
}
