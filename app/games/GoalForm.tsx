"use client";

import { useActionState } from "react";
import { GOAL_TYPE_LABELS } from "@/lib/schemas";
import type { Goal, Player } from "@/lib/schemas";
import { addGoalAction, updateGoalAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";

const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS) as (keyof typeof GOAL_TYPE_LABELS)[];

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

type GoalFormProps = {
  gameId: string;
  rosterPlayers: Player[];
  initialValues?: Goal;
};

export function GoalForm({ gameId, rosterPlayers, initialValues }: GoalFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateGoalAction.bind(null, gameId, initialValues._id)
    : addGoalAction.bind(null, gameId);

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="scoredBy">Scorer</label>
        <select
          id="scoredBy"
          name="scoredBy"
          defaultValue={initialValues?.scoredBy}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        >
          {rosterPlayers.map((player) => (
            <option key={player._id} value={player._id}>
              #{player.number} {player.firstName} {player.surname}
            </option>
          ))}
        </select>
        <FieldErrors messages={state.errors.scoredBy} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="assist1">Assist 1</label>
        <select
          id="assist1"
          name="assist1"
          defaultValue={initialValues?.assist1 ?? ""}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        >
          <option value="">None</option>
          {rosterPlayers.map((player) => (
            <option key={player._id} value={player._id}>
              #{player.number} {player.firstName} {player.surname}
            </option>
          ))}
        </select>
        <FieldErrors messages={state.errors.assist1} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="assist2">Assist 2</label>
        <select
          id="assist2"
          name="assist2"
          defaultValue={initialValues?.assist2 ?? ""}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        >
          <option value="">None</option>
          {rosterPlayers.map((player) => (
            <option key={player._id} value={player._id}>
              #{player.number} {player.firstName} {player.surname}
            </option>
          ))}
        </select>
        <FieldErrors messages={state.errors.assist2} />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="minute">Minute</label>
          <input
            id="minute"
            name="minute"
            type="number"
            min={0}
            defaultValue={initialValues?.minute}
            className="w-20 border border-black/20 rounded px-2 py-1 dark:border-white/20"
          />
          <FieldErrors messages={state.errors.minute} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="second">Second</label>
          <input
            id="second"
            name="second"
            type="number"
            min={0}
            max={59}
            defaultValue={initialValues?.second}
            className="w-20 border border-black/20 rounded px-2 py-1 dark:border-white/20"
          />
          <FieldErrors messages={state.errors.second} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type">Type</label>
        <select
          id="type"
          name="type"
          defaultValue={initialValues?.type ?? GOAL_TYPES[0]}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        >
          {GOAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {GOAL_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <FieldErrors messages={state.errors.type} />
      </div>

      <FieldErrors messages={state.errors.form} />

      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/20"
      >
        {pending
          ? isEdit
            ? "Saving…"
            : "Recording…"
          : isEdit
            ? "Save changes"
            : "Record goal"}
      </button>
    </form>
  );
}
