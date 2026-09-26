"use client";

import { useActionState } from "react";
import type { Game, Player } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  FormActions,
  FormErrorSummary,
  Message,
} from "@/app/_ui";
import { updateGameAwardsAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";
import { RosterSelect } from "./RosterSelect";

type AwardsFormProps = {
  game: Game;
  // Only the game's currently rostered players are offered — awards must be
  // rostered (GameSchema's checkGameRefs enforces it), unlike RosterForm's
  // roster-union-active superset, which exists only because that form can
  // add new players.
  rosterPlayers: Player[];
};

export function AwardsForm({ game, rosterPlayers }: AwardsFormProps) {
  const action = updateGameAwardsAction.bind(null, game._id);
  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  if (rosterPlayers.length === 0) {
    return (
      <Message tone="info" title="No roster yet" className="max-w-md">
        Add players to the roster first.
      </Message>
    );
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <FormErrorSummary errors={state.errors} />
      <RosterSelect
        id="manOfTheMatchPlayerId"
        name="manOfTheMatchPlayerId"
        label="Player of the Game"
        rosterPlayers={rosterPlayers}
        defaultValue={game.manOfTheMatchPlayerId}
        errors={state.errors.manOfTheMatchPlayerId}
      />
      <RosterSelect
        id="warriorOfTheGamePlayerId"
        name="warriorOfTheGamePlayerId"
        label="Warrior of the Game"
        rosterPlayers={rosterPlayers}
        defaultValue={game.warriorOfTheGamePlayerId}
        errors={state.errors.warriorOfTheGamePlayerId}
      />

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save awards"}
        </Button>
        <ButtonLink href={`/games/${game._id}`} variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
