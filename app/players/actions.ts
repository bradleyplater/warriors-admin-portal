"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PlayerCreateInputSchema } from "@/lib/schemas";
import { createPlayer, getTheTeam, DuplicateShirtNumberError } from "@/lib/repositories";
import type { CreatePlayerFormState } from "./form-state";

function optionalString(value: FormDataEntryValue | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? undefined : trimmed;
}

export async function createPlayerAction(
  _prevState: CreatePlayerFormState,
  formData: FormData,
): Promise<CreatePlayerFormState> {
  const team = await getTheTeam();
  if (!team) {
    return {
      errors: { form: ["No team is configured — cannot create a player."] },
    };
  }

  const nickname = optionalString(formData.get("nickname"));
  const imagePath = optionalString(formData.get("imagePath"));

  const parsed = PlayerCreateInputSchema.safeParse({
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
    teamId: team._id,
  });

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
