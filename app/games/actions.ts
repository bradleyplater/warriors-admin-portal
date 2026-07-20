"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { GameCreateInputSchema } from "@/lib/schemas";
import type { Player } from "@/lib/schemas";
import {
  createGame,
  getGame,
  getTheTeam,
  listPlayers,
  updateGame,
  updateGameRoster,
  RosterPlayerReferencedError,
  type BlockedRosterPlayer,
} from "@/lib/repositories";
import type { GameFormState } from "./form-state";

// Cross-field roster/goal/penalty rules in GameCreateInputSchema report
// issues at nested paths (e.g. ["team", "roster", 1, "playerId"]) — map
// those back to the form's own field names so errors render next to the
// right control instead of all collapsing into one generic message.
function fieldKeyFor(path: (string | number)[]): string {
  const [first, second] = path;
  if (first === "team" && second === "roster") return "roster";
  if (first === "opponentTeam" && second === "name") return "opponentName";
  if (typeof first === "string") return first;
  return "form";
}

function mapFieldErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = fieldKeyFor(issue.path as (string | number)[]);
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

function parseDateInput(formData: FormData): Date | undefined {
  const dateValue = formData.get("date");
  return typeof dateValue === "string" && dateValue !== ""
    ? new Date(dateValue)
    : undefined;
}

function parseGameFormData(formData: FormData, teamId: string) {
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

export async function createGameAction(
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const team = await getTheTeam();
  if (!team) {
    return {
      errors: { form: ["No team is configured — cannot create a game."] },
    };
  }

  const parsed = parseGameFormData(formData, team._id);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  const game = await createGame(parsed.data);

  revalidatePath("/games");
  redirect(`/games/${game._id}`);
}

// Details-only edit — team/roster/goals/penalties are carried over
// unchanged from the existing game and re-validated as part of the same
// GameCreateInputSchema used at creation, but this action never writes
// `roster`: roster changes go through updateGameRosterAction on its own
// route (/games/[id]/roster), not this form.
export async function updateGameAction(
  id: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const existing = await getGame(id);
  if (!existing) {
    return { errors: { form: ["Game not found."] } };
  }

  const date = parseDateInput(formData);

  const parsed = GameCreateInputSchema.safeParse({
    date,
    seasonId: formData.get("seasonId"),
    type: formData.get("type"),
    location: formData.get("location"),
    netminderPlayerId: existing.netminderPlayerId,
    manOfTheMatchPlayerId: existing.manOfTheMatchPlayerId,
    warriorOfTheGamePlayerId: existing.warriorOfTheGamePlayerId,
    team: existing.team,
    opponentTeam: {
      name: formData.get("opponentName"),
      goals: existing.opponentTeam.goals,
      penalties: existing.opponentTeam.penalties,
    },
  });

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await updateGame(id, {
    date: parsed.data.date,
    seasonId: parsed.data.seasonId,
    type: parsed.data.type,
    location: parsed.data.location,
    opponentName: parsed.data.opponentTeam.name,
  });

  revalidatePath("/games");
  revalidatePath(`/games/${id}`);
  redirect(`/games/${id}`);
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// Composes the human-readable, per-player reason for a blocked removal.
// The repository only knows counts and booleans (see BlockedRosterPlayer);
// naming the player requires the player list, which the repository layer
// doesn't have — so message composition lives here, not in games.ts.
function describeBlockedPlayer(
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

// Roster-only edit, its own route (/games/[id]/roster) and its own action —
// see design.md for why this doesn't share a form/action with
// updateGameAction. Only the players still referenced by a goal, assist,
// penalty, the netminder selection, or an award are blocked from removal;
// every other requested change (other removals, additions) is applied by
// updateGameRoster before this action ever sees the outcome. On a partial
// block this does NOT redirect — the admin needs to see which player(s)
// remain and why.
export async function updateGameRosterAction(
  id: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const requestedRoster = formData
    .getAll("roster")
    .map((playerId) => ({ playerId: String(playerId) }));

  try {
    await updateGameRoster(id, requestedRoster);
  } catch (error) {
    if (error instanceof RosterPlayerReferencedError) {
      const players = await listPlayers();
      const messages = error.blocked.map((entry) =>
        describeBlockedPlayer(entry, players),
      );
      revalidatePath(`/games/${id}`);
      revalidatePath(`/games/${id}/roster`);
      return { errors: { roster: messages } };
    }
    throw error;
  }

  revalidatePath("/games");
  revalidatePath(`/games/${id}`);
  redirect(`/games/${id}`);
}
