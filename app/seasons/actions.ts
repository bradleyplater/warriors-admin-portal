"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSeason, DuplicateSeasonError } from "@/lib/repositories";
import type { SeasonFormState } from "./form-state";
import { parseSeasonFormData } from "./form-parsing";

export async function createSeasonAction(
  _prevState: SeasonFormState,
  formData: FormData,
): Promise<SeasonFormState> {
  const parsed = parseSeasonFormData(formData);

  if (!parsed.success) {
    return { errors: parsed.errors };
  }

  try {
    await createSeason(parsed.data);
  } catch (error) {
    if (error instanceof DuplicateSeasonError) {
      return { errors: { startYear: [error.message] } };
    }
    throw error;
  }

  revalidatePath("/seasons");
  redirect("/seasons");
}
