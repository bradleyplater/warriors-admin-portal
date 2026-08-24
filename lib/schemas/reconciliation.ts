import { z } from "zod";

// Migration Plan Step 3 (docs/04-migration-plan.md) / D6 sign-off gate. One
// record per mismatch a human has explicitly accepted ("the game records
// are right, the stored aggregate drifted") — "fix the game data" needs no
// record here at all, since correcting the game and re-running just makes
// the mismatch stop appearing on its own.
//
// Matched against a freshly generated report by (mismatchKey, storedValue,
// computedValue) together, not mismatchKey alone: the legacy stored fields
// never change (frozen per the migration plan), but computedValue can shift
// if an unrelated game edit changes the derivation. If it does, this
// acceptance no longer describes the disagreement being shown, so the
// mismatch must reappear as unresolved rather than staying silently
// accepted — see lib/migration/reconcile/resolutions.ts.
const ReconciliationResolutionShape = z.object({
  _id: z.string(), // "RCN######"
  mismatchKey: z.string().min(1),
  dimension: z.enum(["player-stats", "team-stats", "game-score"]),
  entityId: z.string().min(1),
  field: z.string().min(1),
  storedValue: z.number(),
  computedValue: z.number(),
  resolvedAt: z.date(),
});

export const ReconciliationResolutionSchema = ReconciliationResolutionShape;
export type ReconciliationResolution = z.infer<
  typeof ReconciliationResolutionSchema
>;

export const ReconciliationResolutionCreateInputSchema =
  ReconciliationResolutionShape.omit({ _id: true });
export type ReconciliationResolutionCreateInput = z.infer<
  typeof ReconciliationResolutionCreateInputSchema
>;
