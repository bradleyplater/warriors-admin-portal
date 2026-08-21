"use client";

import { useActionState } from "react";
import type { ActiveReviewPlayer } from "@/lib/migration/active-review/list";
import { setPlayerActiveAction } from "./actions";
import {
  initialActiveReviewRowState,
  type ActiveReviewRowState,
} from "./form-state";

function buttonClasses(pressed: boolean): string {
  return pressed
    ? "rounded border border-black px-3 py-1.5 text-sm font-medium dark:border-white"
    : "rounded border border-black/20 px-3 py-1.5 text-sm font-medium text-black/60 hover:bg-black/[0.03] dark:border-white/20 dark:text-white/60 dark:hover:bg-white/[0.05]";
}

export function ActiveReviewRow({ player }: { player: ActiveReviewPlayer }) {
  const action = setPlayerActiveAction.bind(null, player.playerId);
  const [state, formAction, pending] = useActionState<
    ActiveReviewRowState,
    FormData
  >(action, initialActiveReviewRowState);

  const reviewed = typeof player.active === "boolean";

  return (
    <tr className="border-b border-black/5 dark:border-white/10">
      <td className="py-2 pr-4">{player.number ?? "—"}</td>
      <td className="py-2 pr-4">
        {player.firstName} {player.surname}
        {player.playedCurrentSeason && (
          <span className="ml-2 text-xs text-black/50 dark:text-white/50">
            played this season
          </span>
        )}
      </td>
      <td className="py-2 pr-4">
        <form action={formAction} className="flex items-center gap-2">
          <button
            type="submit"
            name="active"
            value="true"
            disabled={pending}
            aria-pressed={player.active === true}
            className={buttonClasses(player.active === true)}
          >
            Active
          </button>
          <button
            type="submit"
            name="active"
            value="false"
            disabled={pending}
            aria-pressed={player.active === false}
            className={buttonClasses(player.active === false)}
          >
            Inactive
          </button>
          {!reviewed && !state.error && (
            <span className="text-xs text-black/50 dark:text-white/50">
              Not yet reviewed
            </span>
          )}
          {state.error && (
            <span className="text-sm text-red-600">{state.error}</span>
          )}
        </form>
      </td>
    </tr>
  );
}
