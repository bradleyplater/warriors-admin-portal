"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updatePlayer, DuplicateShirtNumberError } from "@/lib/repositories";
import type { ActiveReviewRowState } from "./form-state";

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
    if (error instanceof DuplicateShirtNumberError) {
      return { error: error.message };
    }
    // Step 2 assumes Step 1 (the additive migration, KAN-34) already ran for
    // every player — if positions/number/teamId are still missing, the
    // resulting document fails PlayerSchema.parse inside updatePlayer().
    // Surface that as a row-level message instead of a 500.
    if (error instanceof z.ZodError) {
      return {
        error:
          "This player's record is missing required migration data — run the additive migration first.",
      };
    }
    throw error;
  }

  revalidatePath("/migration-review/active");
  return {};
}
