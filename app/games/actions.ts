"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addGoal,
  addOpponentGoal,
  addOpponentPenalty,
  addPenalty,
  createGame,
  deleteGoal,
  deleteOpponentGoal,
  deleteOpponentPenalty,
  deletePenalty,
  editGoal,
  editOpponentGoal,
  editOpponentPenalty,
  editPenalty,
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
  parseGameAwardsFormData,
  parseGameDetailsFormData,
  parseGameFormData,
  parseGoalFormData,
  parseOpponentGoalFormData,
  parseOpponentPenaltyFormData,
  parsePenaltyFormData,
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
// route (/games/[id]/roster), not this form. Netminder is included here
// (not on the awards route) because it isn't an award; this form always
// submits the netminder select, so an empty selection maps to updateGame's
// `null` clear-sentinel, same reasoning as updateGameAwardsAction.
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
    netminderPlayerId: parsed.data.netminderPlayerId ?? null,
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

// Penalty add/edit/delete mirror the goal actions above exactly — same
// "one concern per form/action" split, same shared-schema reasoning
// (PenaltyCreateInputSchema via parsePenaltyFormData is the same schema
// addPenalty/editPenalty re-validate against at the repository layer).
export async function addPenaltyAction(
  gameId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parsePenaltyFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await addPenalty(gameId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

export async function updatePenaltyAction(
  gameId: string,
  penaltyId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parsePenaltyFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await editPenalty(gameId, penaltyId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

// Bound directly to a <form action={...}> with no fields, same as
// deleteGoalAction.
export async function deletePenaltyAction(
  gameId: string,
  penaltyId: string,
): Promise<void> {
  await deletePenalty(gameId, penaltyId);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

// Opponent goal add/edit/delete mirror the team goal actions above exactly —
// same "one concern per form/action" split, same shared-schema reasoning
// (OpponentGoalCreateInputSchema via parseOpponentGoalFormData is the same
// schema addOpponentGoal/editOpponentGoal re-validate against at the
// repository layer).
export async function addOpponentGoalAction(
  gameId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parseOpponentGoalFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await addOpponentGoal(gameId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

export async function updateOpponentGoalAction(
  gameId: string,
  opponentGoalId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parseOpponentGoalFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await editOpponentGoal(gameId, opponentGoalId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

// Bound directly to a <form action={...}> with no fields, same as
// deleteGoalAction.
export async function deleteOpponentGoalAction(
  gameId: string,
  opponentGoalId: string,
): Promise<void> {
  await deleteOpponentGoal(gameId, opponentGoalId);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

// Opponent penalty add/edit/delete mirror the team penalty actions above
// exactly — same reasoning as the opponent goal actions.
export async function addOpponentPenaltyAction(
  gameId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parseOpponentPenaltyFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await addOpponentPenalty(gameId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

export async function updateOpponentPenaltyAction(
  gameId: string,
  opponentPenaltyId: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const parsed = parseOpponentPenaltyFormData(formData);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await editOpponentPenalty(gameId, opponentPenaltyId, parsed.data);

  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
}

// Bound directly to a <form action={...}> with no fields, same as
// deletePenaltyAction.
export async function deleteOpponentPenaltyAction(
  gameId: string,
  opponentPenaltyId: string,
): Promise<void> {
  await deleteOpponentPenalty(gameId, opponentPenaltyId);

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

// Awards-only edit, its own route (/games/[id]/awards) and its own action —
// same "one concern per form/action" split as roster vs. details. Covers
// Player of the Game and Warrior of the Game only — netminder isn't an
// award, so it's edited via updateGameAction/GameForm instead. This form
// always submits both selects at once, so an empty select means "cleared"
// (updateGame's `null` sentinel), not "leave unchanged" (`undefined`) — see
// updateGame's GameUpdateInput for why that distinction matters.
export async function updateGameAwardsAction(
  id: string,
  _prevState: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const existing = await getGame(id);
  if (!existing) {
    return { errors: { form: ["Game not found."] } };
  }

  const parsed = parseGameAwardsFormData(formData, existing);

  if (!parsed.success) {
    return { errors: mapFieldErrors(parsed.error) };
  }

  await updateGame(id, {
    manOfTheMatchPlayerId: parsed.data.manOfTheMatchPlayerId ?? null,
    warriorOfTheGamePlayerId: parsed.data.warriorOfTheGamePlayerId ?? null,
  });

  revalidatePath(`/games/${id}`);
  revalidatePath(`/games/${id}/awards`);
  redirect(`/games/${id}`);
}
