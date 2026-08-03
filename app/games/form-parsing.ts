import type { z } from "zod";
import {
  GameCreateInputSchema,
  GoalCreateInputSchema,
  OpponentGoalCreateInputSchema,
  OpponentPenaltyCreateInputSchema,
  PenaltyCreateInputSchema,
} from "@/lib/schemas";
import type { Game, Player } from "@/lib/schemas";
import type { BlockedRosterPlayer } from "@/lib/repositories";

// Cross-field roster/goal/penalty rules in GameCreateInputSchema report
// issues at nested paths (e.g. ["team", "roster", 1, "playerId"]) — map
// those back to the form's own field names so errors render next to the
// right control instead of all collapsing into one generic message.
//
// Kept in a plain module rather than actions.ts: a "use server" file may
// only export async functions, and these need to be unit-testable directly.
export function fieldKeyFor(path: (string | number)[]): string {
  const [first, second] = path;
  if (first === "team" && second === "roster") return "roster";
  if (first === "opponentTeam" && second === "name") return "opponentName";
  if (typeof first === "string") return first;
  return "form";
}

export function mapFieldErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = fieldKeyFor(issue.path as (string | number)[]);
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

export function parseDateInput(formData: FormData): Date | undefined {
  const dateValue = formData.get("date");
  return typeof dateValue === "string" && dateValue !== ""
    ? new Date(dateValue)
    : undefined;
}

export function parseGameFormData(formData: FormData, teamId: string) {
  const date = parseDateInput(formData);

  return GameCreateInputSchema.safeParse({
    date,
    seasonId: formData.get("seasonId"),
    type: formData.get("type"),
    location: formData.get("location"),
    team: {
      id: teamId,
      roster: formData.getAll("roster").map((playerId) => ({ playerId })),
      goals: [],
      penalties: [],
    },
    opponentTeam: {
      name: formData.get("opponentName"),
      goals: [],
      penalties: [],
    },
  });
}

// Details-only edit — team/goals/penalties are carried over unchanged from
// the existing game and re-validated as part of the same GameCreateInputSchema
// used at creation, but the caller (updateGameAction) never writes `roster`
// from this: roster changes go through updateGameRosterAction on its own
// route (/games/[id]/roster), and Player of the Game/Warrior of the Game go
// through updateGameAwardsAction on /games/[id]/awards. Netminder lives here
// rather than on the awards route because it isn't an award — it's a factual
// detail of the game, like date or opponent — and this form always submits
// the select, so an empty selection unambiguously means "cleared" (mapped to
// updateGame's `null` clear-sentinel by updateGameAction, not by this parser).
export function parseGameDetailsFormData(formData: FormData, existing: Game) {
  const date = parseDateInput(formData);
  const netminderPlayerId = optionalFormString(formData.get("netminderPlayerId"));

  return GameCreateInputSchema.safeParse({
    date,
    seasonId: formData.get("seasonId"),
    type: formData.get("type"),
    location: formData.get("location"),
    ...(netminderPlayerId !== undefined && { netminderPlayerId }),
    manOfTheMatchPlayerId: existing.manOfTheMatchPlayerId,
    warriorOfTheGamePlayerId: existing.warriorOfTheGamePlayerId,
    team: existing.team,
    opponentTeam: {
      name: formData.get("opponentName"),
      goals: existing.opponentTeam.goals,
      penalties: existing.opponentTeam.penalties,
    },
  });
}

// Awards-only edit — separate route (/games/[id]/awards) and separate action
// from both parseGameDetailsFormData and updateGameRosterAction, same "one
// concern per form/action" split. Covers Player of the Game and Warrior of
// the Game only — netminder is handled by parseGameDetailsFormData/GameForm
// instead, since it isn't an award. Unlike the details form, this one always
// submits both award selects at once, so an empty select unambiguously means
// "cleared", not "leave unchanged" (that distinction is handled by
// updateGameAwardsAction mapping undefined here to updateGame's `null`
// clear-sentinel, not by this parser).
export function parseGameAwardsFormData(formData: FormData, existing: Game) {
  const manOfTheMatchPlayerId = optionalFormString(
    formData.get("manOfTheMatchPlayerId"),
  );
  const warriorOfTheGamePlayerId = optionalFormString(
    formData.get("warriorOfTheGamePlayerId"),
  );

  return GameCreateInputSchema.safeParse({
    date: existing.date,
    seasonId: existing.seasonId,
    type: existing.type,
    location: existing.location,
    netminderPlayerId: existing.netminderPlayerId,
    ...(manOfTheMatchPlayerId !== undefined && { manOfTheMatchPlayerId }),
    ...(warriorOfTheGamePlayerId !== undefined && { warriorOfTheGamePlayerId }),
    team: existing.team,
    opponentTeam: existing.opponentTeam,
  });
}

// Both the new-goal and edit-goal forms share this parser — GoalCreateInputSchema's
// issue paths (e.g. ["assist1"]) are already flat field names, so the existing
// fieldKeyFor/mapFieldErrors above apply unchanged, no goal-specific mapping needed.
export function parseGoalFormData(formData: FormData) {
  const assist1 = optionalFormString(formData.get("assist1"));
  const assist2 = optionalFormString(formData.get("assist2"));

  return GoalCreateInputSchema.safeParse({
    scoredBy: formData.get("scoredBy"),
    ...(assist1 !== undefined ? { assist1 } : {}),
    ...(assist2 !== undefined ? { assist2 } : {}),
    minute: Number(formData.get("minute")),
    second: Number(formData.get("second")),
    type: formData.get("type"),
  });
}

// Both the new-penalty and edit-penalty forms share this parser — same
// reasoning as parseGoalFormData: PenaltyCreateInputSchema's issue paths are
// already flat field names, so fieldKeyFor/mapFieldErrors apply unchanged.
export function parsePenaltyFormData(formData: FormData) {
  return PenaltyCreateInputSchema.safeParse({
    offender: formData.get("offender"),
    minute: Number(formData.get("minute")),
    second: Number(formData.get("second")),
    type: formData.get("type"),
    duration: Number(formData.get("duration")),
  });
}

// Both the new-opponent-goal and edit-opponent-goal forms share this parser —
// same reasoning as parseGoalFormData, but there are no assist fields and the
// scorer is free text (OpponentGoalCreateInputSchema), not a roster playerId.
export function parseOpponentGoalFormData(formData: FormData) {
  return OpponentGoalCreateInputSchema.safeParse({
    scoredBy: formData.get("scoredBy"),
    minute: Number(formData.get("minute")),
    second: Number(formData.get("second")),
    type: formData.get("type"),
  });
}

// Both the new-opponent-penalty and edit-opponent-penalty forms share this
// parser — same reasoning as parsePenaltyFormData, but the offender is free
// text (OpponentPenaltyCreateInputSchema), not a roster playerId or BENCH.
export function parseOpponentPenaltyFormData(formData: FormData) {
  return OpponentPenaltyCreateInputSchema.safeParse({
    offender: formData.get("offender"),
    minute: Number(formData.get("minute")),
    second: Number(formData.get("second")),
    type: formData.get("type"),
    duration: Number(formData.get("duration")),
  });
}

function optionalFormString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// Composes the human-readable, per-player reason for a blocked roster
// removal. The repository only knows counts and booleans (see
// BlockedRosterPlayer); naming the player requires the player list, which
// the repository layer doesn't have — so message composition lives here.
export function describeBlockedPlayer(
  entry: BlockedRosterPlayer,
  players: Player[],
): string {
  const player = players.find((candidate) => candidate._id === entry.playerId);
  const label = player
    ? `#${player.number} ${player.firstName} ${player.surname}`
    : entry.playerId;

  const parts: string[] = [];
  if (entry.goalCount > 0) {
    parts.push(`scored ${pluralize(entry.goalCount, "goal")}`);
  }
  if (entry.assistCount > 0) {
    parts.push(`recorded ${pluralize(entry.assistCount, "assist")}`);
  }
  if (entry.penaltyCount > 0) {
    parts.push(`took ${pluralize(entry.penaltyCount, "penalty", "penalties")}`);
  }
  if (entry.isNetminder) parts.push("was netminder");
  if (entry.isManOfTheMatch) parts.push("was Man of the Match");
  if (entry.isWarriorOfTheGame) parts.push("was Warrior of the Game");

  return `${label} can't be removed — they ${joinWithAnd(parts)} for this game.`;
}
