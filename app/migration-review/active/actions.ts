"use server";

import { revalidatePath } from "next/cache";
import { updatePlayer } from "@/lib/repositories";
import type { ActiveReviewRowState } from "./form-state";
import { describeActiveReviewSaveError } from "./error-messages";

export async function setPlayerActiveAction(
  playerId: string,
  _prevState: ActiveReviewRowState,
  formData: FormData,
): Promise<ActiveReviewRowState> {
  const raw = formData.get("active");
  if (raw !== "true" && raw !== "false") {
    return { error: "Choose Active or Inactive." };
  }

  try {
    await updatePlayer(playerId, { active: raw === "true" });
  } catch (error) {
    const message = describeActiveReviewSaveError(error);
    if (message === undefined) {
      throw error;
    }
    return { error: message };
  }

  revalidatePath("/migration-review/active");
  return {};
}
