"use server";

import { revalidatePath } from "next/cache";
import { updatePlayer } from "@/lib/repositories";
import type { NumberReviewRowState } from "./form-state";
import { describeNumberReviewSaveError } from "./error-messages";
import { parseNewShirtNumber } from "./number-validation";

export async function setPlayerNumberAction(
  playerId: string,
  _prevState: NumberReviewRowState,
  formData: FormData,
): Promise<NumberReviewRowState> {
  const parsed = parseNewShirtNumber(formData.get("number"));
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    await updatePlayer(playerId, { number: parsed.number });
  } catch (error) {
    const message = describeNumberReviewSaveError(error);
    if (message === undefined) {
      throw error;
    }
    return { error: message };
  }

  revalidatePath("/migration-review/shirt-number");
  return {};
}
