import type { ReconciliationResolution } from "../../schemas";
import type { Mismatch, RawMismatch } from "./types";

function resolutionSignature(
  key: string,
  storedValue: number,
  computedValue: number,
): string {
  return `${key}:${storedValue}:${computedValue}`;
}

// A mismatch counts as resolved only when a persisted resolution matches
// its key AND its current stored/computed values — see
// lib/schemas/reconciliation.ts's field comment for why value drift must
// un-resolve a mismatch rather than leaving a stale acceptance in place.
export function applyResolutions(
  mismatches: RawMismatch[],
  resolutions: ReconciliationResolution[],
): Mismatch[] {
  const resolvedSignatures = new Set(
    resolutions.map((resolution) =>
      resolutionSignature(
        resolution.mismatchKey,
        resolution.storedValue,
        resolution.computedValue,
      ),
    ),
  );

  return mismatches.map((mismatch) => ({
    ...mismatch,
    resolved: resolvedSignatures.has(
      resolutionSignature(
        mismatch.key,
        mismatch.storedValue,
        mismatch.computedValue,
      ),
    ),
  }));
}
