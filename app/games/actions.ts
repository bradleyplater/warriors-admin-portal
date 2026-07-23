"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addGoal,
  createGame,
  deleteGoal,
  editGoal,
  getGame,
  getTheTeam,
  listPlayers,
  updateGame,
  updateGameRoster,
  RosterPlayerReferencedError,
} from "@/lib/repositories";
import type { GameFormState } from "./form-state";
import {
  describeBlockedPlayer,
  mapFieldErrors,
  parseGameDetailsFormData,
  parseGameFormData,
  parseGoalFormData,
} from "./form-parsing";

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

  const parsed = parseGameDetailsFormData(formData, existing);

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

// Goal add/edit/delete are their own actions, separate from the details and
// roster forms above — same "one concern per form/action" split as roster
// management. GoalCreateInputSchema (via parseGoalFormData) is the same
// schema addGoal/editGoal re-validate against at the repository layer, so
// there's nothing to duplicate here beyond parsing the form fields.
export async function addGoalAction(
  gameId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parseGoalFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await addGoal(gameId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

export async function updateGoalAction(
  gameId: string,
  goalId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parseGoalFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await editGoal(gameId, goalId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

// Bound directly to a <form action={...}> with no fields — a delete needs no
// client state, unlike add/edit, so this skips useActionState entirely.
export async function deleteGoalAction(
  gameId: string,
  goalId: string,
): Promise<void> {
  await deleteGoal(gameId, goalId);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
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
