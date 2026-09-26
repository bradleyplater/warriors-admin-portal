"use client";

import { useActionState } from "react";
import type { NumberReviewPlayer } from "@/lib/migration/number-review/list";
import { Button } from "@/app/_ui";
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
    <tr>
      <td className="wr-num">{player.currentNumber}</td>
      <td>
        {player.firstName} {player.surname}
      </td>
      <td>
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            name="number"
            placeholder="1-99"
            aria-label={`New number for ${player.firstName} ${player.surname}`}
            aria-invalid={state.error ? true : undefined}
            disabled={pending}
            className="wr-input w-20 py-1"
          />
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
          {state.error && (
            <p role="alert" className="wr-field__error">
              <span aria-hidden="true">{"✕"} </span>
              {state.error}
            </p>
          )}
        </form>
      </td>
    </tr>
  );
}
