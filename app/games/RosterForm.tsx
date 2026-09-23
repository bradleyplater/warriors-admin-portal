"use client";

import { useActionState } from "react";
import type { Game, Player } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  Card,
  Choice,
  FieldErrors,
  FormActions,
  Message,
} from "@/app/_ui";
import { updateGameRosterAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";

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
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      {state.errors.form?.map((message) => (
        <Message key={message} tone="danger" title="Not saved">
          {message}
        </Message>
      ))}

      <fieldset key={rosterKey} className="wr-fieldset">
        <legend className="wr-field__label mb-3">Roster</legend>
        <Card>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-4 gap-y-2">
            {pickerPlayers.map((player) => (
              <Choice
                key={player._id}
                type="checkbox"
                name="roster"
                value={player._id}
                defaultChecked={rosteredIds.has(player._id)}
              >
                <span className="t-data text-fg-secondary">
                  #{player.number ?? "—"}
                </span>
                {player.firstName} {player.surname}
                {!player.active && (
                  <span className="t-label text-fg-secondary"> (inactive)</span>
                )}
              </Choice>
            ))}
          </div>
        </Card>
      </fieldset>

      <FieldErrors messages={state.errors.roster} />

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save roster"}
        </Button>
        <ButtonLink href={`/games/${game._id}`} variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
