"use client";

import { useActionState } from "react";
import type { Game, Player } from "@/lib/schemas";
import { updateGameAwardsAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";
import { RosterSelect } from "./RosterSelect";

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
      <p className="text-sm text-black/60 dark:text-white/60">
        Add players to the roster first.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
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

      <FieldErrors messages={state.errors.form} />

      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/20"
      >
        {pending ? "Saving…" : "Save awards"}
      </button>
    </form>
  );
}
