import { z } from "zod";
import { DuplicateShirtNumberError } from "@/lib/repositories";

// Pure branch-mapping for setPlayerNumberAction's write failures, mirroring
// app/migration-review/active/error-messages.ts — the action itself calls
// revalidatePath, which only works inside a real Next.js request, so it's
// exercised end-to-end by the Playwright spec instead. undefined means "not
// a recognised case, rethrow".
export function describeNumberReviewSaveError(error: unknown): string | undefined {
  if (error instanceof DuplicateShirtNumberError) {
    return error.message;
  }
  // Step 2 assumes Step 1 (the additive migration, KAN-34) already ran for
  // every player — if positions/teamId are still missing, the resulting
  // document fails PlayerSchema.parse inside updatePlayer().
  if (error instanceof z.ZodError) {
    return "This player's record is missing required migration data — run the additive migration first.";
  }
  return undefined;
}
