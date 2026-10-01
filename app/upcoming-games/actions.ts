"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createUpcomingGame,
  deleteUpcomingGame,
  getOpponent,
  updateUpcomingGame,
} from "@/lib/repositories";
import type { UpcomingGameCreateInput } from "@/lib/schemas";
import type { UpcomingGameFormState } from "./form-state";
import {
  mapUpcomingGameFieldErrors,
  parseUpcomingGameFormData,
} from "./form-parsing";

// The schema only checks the id's shape; whether the opponent exists needs
// the DB (a tampered request, or an opponent deleted after the form loaded).
async function parseAndCheck(
  formData: FormData,
): Promise<UpcomingGameFormState | { data: UpcomingGameCreateInput }> {
  const parsed = parseUpcomingGameFormData(formData);
  if (!parsed.success) {
    return { errors: mapUpcomingGameFieldErrors(parsed.error) };
  }
  if (!(await getOpponent(parsed.data.opponentId))) {
    return { errors: { opponentId: ["Select an existing opponent"] } };
  }
  return { data: parsed.data };
}

export async function createUpcomingGameAction(
  _prevState: UpcomingGameFormState,
  formData: FormData,
): Promise<UpcomingGameFormState> {
  const result = await parseAndCheck(formData);
  if ("errors" in result) {
    return { errors: result.errors };
  }

  await createUpcomingGame(result.data);

  revalidatePath("/upcoming-games");
  redirect("/upcoming-games");
}

export async function updateUpcomingGameAction(
  id: string,
  _prevState: UpcomingGameFormState,
  formData: FormData,
): Promise<UpcomingGameFormState> {
  const result = await parseAndCheck(formData);
  if ("errors" in result) {
    return { errors: result.errors };
  }

  await updateUpcomingGame(id, result.data);

  revalidatePath("/upcoming-games");
  redirect("/upcoming-games");
}

export async function deleteUpcomingGameAction(id: string): Promise<void> {
  await deleteUpcomingGame(id);

  revalidatePath("/upcoming-games");
  redirect("/upcoming-games");
}
