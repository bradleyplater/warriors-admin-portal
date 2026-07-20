"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPlayer,
  getTheTeam,
  updatePlayer,
  DuplicateShirtNumberError,
} from "@/lib/repositories";
import type { PlayerFormState } from "./form-state";
import { parsePlayerFormData } from "./form-parsing";

export async function createPlayerAction(
  _prevState: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const team = await getTheTeam();
  if (!team) {
    return {
      errors: { form: ["No team is configured — cannot create a player."] },
    };
  }

  const parsed = parsePlayerFormData(formData, team._id);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createPlayer(parsed.data);
  } catch (error) {
    if (error instanceof DuplicateShirtNumberError) {
      return {
        errors: { number: [error.message] },
      };
    }
    throw error;
  }

  revalidatePath("/players");
  redirect("/players");
}

export async function updatePlayerAction(
  id: string,
  _prevState: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const team = await getTheTeam();
  if (!team) {
    return {
      errors: { form: ["No team is configured — cannot update a player."] },
    };
  }

  const parsed = parsePlayerFormData(formData, team._id);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updatePlayer(id, parsed.data);
  } catch (error) {
    if (error instanceof DuplicateShirtNumberError) {
      return {
        errors: { number: [error.message] },
      };
    }
    throw error;
  }

  revalidatePath("/players");
  redirect("/players");
}
