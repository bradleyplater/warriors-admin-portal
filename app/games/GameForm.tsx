"use client";

import { useActionState } from "react";
import type { Game, Player, Season } from "@/lib/schemas";
import { createGameAction, updateGameAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";

const GAME_TYPES = ["CHALLENGE", "BOTBC", "LLIHC"] as const;

function FieldErrors({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div>
      {messages.map((message) => (
        <p key={message} className="text-sm text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type GameFormProps = {
  seasons: Season[];
  // Only needed in create mode — the edit form doesn't touch the roster,
  // that's handled by RosterForm on its own route.
  activePlayers?: Player[];
  initialValues?: Game;
};

export function GameForm({ seasons, activePlayers, initialValues }: GameFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateGameAction.bind(null, initialValues._id)
    : createGameAction;

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={
            initialValues ? toDateInputValue(initialValues.date) : undefined
          }
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.date} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="seasonId">Season</label>
        <select
          id="seasonId"
          name="seasonId"
          defaultValue={initialValues?.seasonId}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        >
          {seasons.map((season) => (
            <option key={season._id} value={season._id}>
              {season.name}
            </option>
          ))}
        </select>
        <FieldErrors messages={state.errors.seasonId} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="opponentName">Opponent</label>
        <input
          id="opponentName"
          name="opponentName"
          defaultValue={initialValues?.opponentTeam.name}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.opponentName} />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend>Game type</legend>
        {GAME_TYPES.map((type, index) => (
          <label key={type} className="flex items-center gap-2">
            <input
              type="radio"
              name="type"
              value={type}
              defaultChecked={
                initialValues ? initialValues.type === type : index === 0
              }
            />
            {type}
          </label>
        ))}
        <FieldErrors messages={state.errors.type} />
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend>Location</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="location"
            value="HOME"
            defaultChecked={
              initialValues ? initialValues.location === "HOME" : true
            }
          />
          Home
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="location"
            value="AWAY"
            defaultChecked={initialValues?.location === "AWAY"}
          />
          Away
        </label>
        <FieldErrors messages={state.errors.location} />
      </fieldset>

      {!isEdit && activePlayers && (
        <fieldset className="flex flex-col gap-1">
          <legend>Roster</legend>
          {activePlayers.map((player) => (
            <label key={player._id} className="flex items-center gap-2">
              <input type="checkbox" name="roster" value={player._id} />
              #{player.number} {player.firstName} {player.surname}
            </label>
          ))}
          <FieldErrors messages={state.errors.roster} />
        </fieldset>
      )}

      <FieldErrors messages={state.errors.form} />

      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/20"
      >
        {pending
          ? isEdit
            ? "Saving…"
            : "Creating…"
          : isEdit
            ? "Save changes"
            : "Create game"}
      </button>
    </form>
  );
}
