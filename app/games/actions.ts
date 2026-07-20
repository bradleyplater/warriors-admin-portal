"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createGame, getTheTeam } from "@/lib/repositories";
import type { GameFormState } from "./form-state";
import { mapFieldErrors, parseGameFormData } from "./form-parsing";

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
