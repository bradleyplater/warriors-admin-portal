"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Mismatch } from "@/lib/migration/reconcile/types";
import { Badge, Button } from "@/app/_ui";
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
    <tr>
      <td className="t-label text-fg-secondary">
        {DIMENSION_LABELS[mismatch.dimension]}
      </td>
      <td>
        {href ? (
          <Link href={href} className="t-data">
            {mismatch.entityId}
          </Link>
        ) : (
          <span className="t-data">{mismatch.entityId}</span>
        )}
        {seasonId && (
          <span className="t-data ml-2 text-fg-secondary">{seasonId}</span>
        )}
      </td>
      <td>
        {mismatch.field}
        {source && (
          <span className="t-data ml-2 text-xs text-fg-secondary">
            ({source === "player" ? "Player.stats" : "Team.players[].stats"})
          </span>
        )}
      </td>
      <td className="wr-num wr-right">{mismatch.storedValue}</td>
      <td className="wr-num wr-right wr-strong">{mismatch.computedValue}</td>
      <td>
        {mismatch.resolved ? (
          <Badge tone="success">Resolved</Badge>
        ) : (
          <form
            action={formAction}
            className="flex flex-wrap items-center gap-2"
          >
            <Button type="submit" size="sm" disabled={pending}>
              Accept computed
            </Button>
            {state.error && (
              <p role="alert" className="wr-field__error">
                <span aria-hidden="true">{"✕"} </span>
                {state.error}
              </p>
            )}
          </form>
        )}
      </td>
    </tr>
  );
}
