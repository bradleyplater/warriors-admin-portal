"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PlayerCreateInputSchema } from "@/lib/schemas";
import {
  createPlayer,
  getTheTeam,
  updatePlayer,
  DuplicateShirtNumberError,
} from "@/lib/repositories";
import type { PlayerFormState } from "./form-state";

function optionalString(value: FormDataEntryValue | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? undefined : trimmed;
}

function parsePlayerFormData(formData: FormData, teamId: string) {
  const nickname = optionalString(formData.get("nickname"));
  const imagePath = optionalString(formData.get("imagePath"));

  return PlayerCreateInputSchema.safeParse({
    firstName: optionalString(formData.get("firstName")) ?? "",
    surname: optionalString(formData.get("surname")) ?? "",
    number: Number(formData.get("number")),
    positions: formData.getAll("positions"),
    active: formData.get("active") !== null,
    // Omit rather than set to `undefined`: the MongoDB driver serializes an
    // explicit `undefined` value as BSON null, which then fails the
    // optional (not nullable) schema field on read-back.
    ...(nickname !== undefined ? { nickname } : {}),
    ...(imagePath !== undefined ? { imagePath } : {}),
    teamId,
  });
}

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
