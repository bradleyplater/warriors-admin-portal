// Migration Plan Step 3 (docs/04-migration-plan.md) / D6 sign-off gate. One
// entry per disagreement between a computed value (from Game documents
// alone) and a legacy stored aggregate that Step 1 (KAN-34) deliberately
// left untouched. `key` is stable across report runs — see
// lib/migration/reconcile/resolutions.ts for how it's matched against a
// persisted ReconciliationResolution.
interface BaseMismatch {
  key: string;
  entityId: string;
  field: string;
  storedValue: number;
  computedValue: number;
}

export interface PlayerStatsMismatch extends BaseMismatch {
  dimension: "player-stats";
  seasonId: string;
  // Player.stats and Team.players[].stats are two independent stored
  // copies of the same number (docs/04-migration-plan.md's "known
  // discrepancies" table shows them disagreeing with each other, not just
  // with the recompute) — each is compared and reported separately.
  source: "player" | "teamCopy";
}

export interface TeamStatsMismatch extends BaseMismatch {
  dimension: "team-stats";
  seasonId: string;
}

export interface GameScoreMismatch extends BaseMismatch {
  dimension: "game-score";
}

// Produced directly by the per-dimension comparisons — no opinion yet on
// whether a human has already signed off on it.
export type RawMismatch =
  | PlayerStatsMismatch
  | TeamStatsMismatch
  | GameScoreMismatch;

// A raw mismatch plus whether a matching ReconciliationResolution exists
// (lib/migration/reconcile/resolutions.ts's applyResolutions).
export type Mismatch = RawMismatch & { resolved: boolean };
