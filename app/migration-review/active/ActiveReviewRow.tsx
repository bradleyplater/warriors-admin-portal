"use client";

import { useActionState } from "react";
import type { ActiveReviewPlayer } from "@/lib/migration/active-review/list";
import { Badge, Button } from "@/app/_ui";
import { setPlayerActiveAction } from "./actions";
import {
  initialActiveReviewRowState,
  type ActiveReviewRowState,
} from "./form-state";

export function ActiveReviewRow({ player }: { player: ActiveReviewPlayer }) {
  const action = setPlayerActiveAction.bind(null, player.playerId);
  const [state, formAction, pending] = useActionState<
    ActiveReviewRowState,
    FormData
  >(action, initialActiveReviewRowState);

  const reviewed = typeof player.active === "boolean";

  return (
    <tr>
      <td className="wr-num">{player.number ?? "—"}</td>
      <td>
        <span className="flex flex-wrap items-center gap-2">
          {player.firstName} {player.surname}
          {player.playedCurrentSeason && (
            <span className="t-label text-fg-secondary">
              · played this season
            </span>
          )}
          {!reviewed && !state.error && (
            <Badge tone="warning">Not yet reviewed</Badge>
          )}
        </span>
      </td>
      <td>
        {/* A two-way toggle: the current decision is the filled primary
            button, the other stays secondary. */}
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            name="active"
            value="true"
            size="sm"
            disabled={pending}
            aria-pressed={player.active === true}
            variant={player.active === true ? "primary" : "secondary"}
          >
            Active
          </Button>
          <Button
            type="submit"
            name="active"
            value="false"
            size="sm"
            disabled={pending}
            aria-pressed={player.active === false}
            variant={player.active === false ? "primary" : "secondary"}
          >
            Inactive
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
