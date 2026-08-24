"use client";

import { useActionState } from "react";
import type { NumberReviewPlayer } from "@/lib/migration/number-review/list";
import { setPlayerNumberAction } from "./actions";
import {
  initialNumberReviewRowState,
  type NumberReviewRowState,
} from "./form-state";

export function NumberReviewRow({ player }: { player: NumberReviewPlayer }) {
  const action = setPlayerNumberAction.bind(null, player.playerId);
  const [state, formAction, pending] = useActionState<
    NumberReviewRowState,
    FormData
  >(action, initialNumberReviewRowState);

  return (
    <tr className="border-b border-black/5 dark:border-white/10">
      <td className="py-2 pr-4">{player.currentNumber}</td>
      <td className="py-2 pr-4">
        {player.firstName} {player.surname}
      </td>
      <td className="py-2 pr-4">
        <form action={formAction} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            name="number"
            placeholder="1-99"
            disabled={pending}
            className="w-16 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Save
          </button>
          {state.error && (
            <span className="text-sm text-red-600">{state.error}</span>
          )}
        </form>
      </td>
    </tr>
  );
}
