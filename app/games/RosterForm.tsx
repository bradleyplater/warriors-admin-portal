"use client";

import { useActionState } from "react";
import type { Game, Player } from "@/lib/schemas";
import { updateGameRosterAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";

function FieldErrors({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {messages.map((message) => (
        <p key={message} className="text-sm text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

type RosterFormProps = {
  game: Game;
  // Currently-rostered players unioned with active players, sorted by
  // shirt number — a superset of the create form's active-only picker, so
  // a player who has since gone inactive stays visible and removable here.
  pickerPlayers: Player[];
};

export function RosterForm({ game, pickerPlayers }: RosterFormProps) {
  const action = updateGameRosterAction.bind(null, game._id);
  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  const rosteredIds = new Set(game.team.roster.map((entry) => entry.playerId));
  // On a partial block, this form doesn't redirect — the same component
  // instance re-renders with a fresh `game` prop, but the checkboxes below
  // are uncontrolled (defaultChecked only applies at mount). Keying the
  // fieldset to the actual roster forces it to remount whenever the roster
  // really changed server-side, so a blocked player's checkbox re-checks
  // itself instead of misleadingly showing whatever the admin last clicked.
  const rosterKey = [...rosteredIds].sort().join(",");

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <fieldset key={rosterKey} className="flex flex-col gap-1">
        <legend>Roster</legend>
        {pickerPlayers.map((player) => (
          <label key={player._id} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="roster"
              value={player._id}
              defaultChecked={rosteredIds.has(player._id)}
            />
            #{player.number} {player.firstName} {player.surname}
            {!player.active && " (inactive)"}
          </label>
        ))}
      </fieldset>

      <FieldErrors messages={state.errors.roster} />
      <FieldErrors messages={state.errors.form} />

      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/20"
      >
        {pending ? "Saving…" : "Save roster"}
      </button>
    </form>
  );
}
