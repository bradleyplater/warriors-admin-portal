"use server";

import { revalidatePath } from "next/cache";
import { createReconciliationResolution } from "@/lib/repositories";
import type { Mismatch } from "@/lib/migration/reconcile/types";
import type { ReconciliationRowState } from "./form-state";

// Records "accept computed" for one mismatch (Migration Plan Step 3 / D6).
// "Fix the game data" needs no action here — the row links out to the
// relevant player/game, and re-running the report is what clears it.
export async function acceptMismatchAction(
  mismatch: Mismatch,
  _prevState: ReconciliationRowState,
  _formData: FormData,
): Promise<ReconciliationRowState> {
  try {
    await createReconciliationResolution({
      mismatchKey: mismatch.key,
      dimension: mismatch.dimension,
      entityId: mismatch.entityId,
      field: mismatch.field,
      storedValue: mismatch.storedValue,
      computedValue: mismatch.computedValue,
      resolvedAt: new Date(),
    });
  } catch {
    return { error: "Could not save this resolution — try again." };
  }

  revalidatePath("/migration-review/reconciliation");
  return {};
}
