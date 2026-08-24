"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Mismatch } from "@/lib/migration/reconcile/types";
import { acceptMismatchAction } from "./actions";
import {
  initialReconciliationRowState,
  type ReconciliationRowState,
} from "./form-state";

const DIMENSION_LABELS: Record<Mismatch["dimension"], string> = {
  "player-stats": "Player stats",
  "team-stats": "Team stats",
  "game-score": "Game score",
};

function entityHref(mismatch: Mismatch): string | null {
  if (mismatch.dimension === "player-stats") {
    return `/players/${mismatch.entityId}`;
  }
  if (mismatch.dimension === "game-score") {
    return `/games/${mismatch.entityId}`;
  }
  return null;
}

export function ReconciliationRow({ mismatch }: { mismatch: Mismatch }) {
  const action = acceptMismatchAction.bind(null, mismatch);
  const [state, formAction, pending] = useActionState<
    ReconciliationRowState,
    FormData
  >(action, initialReconciliationRowState);

  const href = entityHref(mismatch);
  const seasonId = "seasonId" in mismatch ? mismatch.seasonId : null;
  const source = "source" in mismatch ? mismatch.source : null;

  return (
    <tr className="border-b border-black/5 dark:border-white/10">
      <td className="py-2 pr-4 text-xs text-black/50 dark:text-white/50">
        {DIMENSION_LABELS[mismatch.dimension]}
      </td>
      <td className="py-2 pr-4">
        {href ? (
          <Link href={href} className="underline">
            {mismatch.entityId}
          </Link>
        ) : (
          mismatch.entityId
        )}
        {seasonId && (
          <span className="ml-2 text-xs text-black/50 dark:text-white/50">
            {seasonId}
          </span>
        )}
      </td>
      <td className="py-2 pr-4">
        {mismatch.field}
        {source && (
          <span className="ml-2 text-xs text-black/50 dark:text-white/50">
            ({source === "player" ? "Player.stats" : "Team.players[].stats"})
          </span>
        )}
      </td>
      <td className="py-2 pr-4 tabular-nums">{mismatch.storedValue}</td>
      <td className="py-2 pr-4 tabular-nums">{mismatch.computedValue}</td>
      <td className="py-2 pr-4">
        {mismatch.resolved ? (
          <span className="text-sm font-medium">Resolved</span>
        ) : (
          <form action={formAction} className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
            >
              Accept computed
            </button>
            {state.error && (
              <span className="text-sm text-red-600">{state.error}</span>
            )}
          </form>
        )}
      </td>
    </tr>
  );
}
