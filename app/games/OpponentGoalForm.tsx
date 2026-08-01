"use client";

import { useActionState } from "react";
import { GOAL_TYPE_LABELS } from "@/lib/schemas";
import type { OpponentGoal } from "@/lib/schemas";
import { addOpponentGoalAction, updateOpponentGoalAction } from "./actions";
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

type OpponentGoalFormProps = {
  gameId: string;
  initialValues?: OpponentGoal;
};

export function OpponentGoalForm({ gameId, initialValues }: OpponentGoalFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateOpponentGoalAction.bind(null, gameId, initialValues._id)
    : addOpponentGoalAction.bind(null, gameId);

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="scoredBy">Scorer</label>
        <input
          id="scoredBy"
          name="scoredBy"
          type="text"
          defaultValue={initialValues?.scoredBy}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.scoredBy} />
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
