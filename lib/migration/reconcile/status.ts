import type { Mismatch } from "./types";

// Migration Plan Step 3 (docs/04-migration-plan.md): "reconciliation must
// run clean before cutover". An empty report is vacuously complete — same
// convention as isActiveReviewComplete/isNumberReviewComplete. No cutover
// mechanism consumes this yet (none exists in the app).
export function isReconciliationComplete(mismatches: Mismatch[]): boolean {
  return mismatches.every((mismatch) => mismatch.resolved);
}
