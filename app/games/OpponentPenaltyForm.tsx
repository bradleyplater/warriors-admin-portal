"use client";

import { useActionState } from "react";
import { PENALTY_CODE_LABELS } from "@/lib/schemas";
import type { OpponentPenalty } from "@/lib/schemas";
import { addOpponentPenaltyAction, updateOpponentPenaltyAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";

const PENALTY_CODES = Object.keys(
  PENALTY_CODE_LABELS,
) as (keyof typeof PENALTY_CODE_LABELS)[];

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

type OpponentPenaltyFormProps = {
  gameId: string;
  initialValues?: OpponentPenalty;
};

export function OpponentPenaltyForm({ gameId, initialValues }: OpponentPenaltyFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateOpponentPenaltyAction.bind(null, gameId, initialValues._id)
    : addOpponentPenaltyAction.bind(null, gameId);

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="offender">Offender</label>
        <input
          id="offender"
          name="offender"
          type="text"
          defaultValue={initialValues?.offender}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.offender} />
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
          defaultValue={initialValues?.type ?? PENALTY_CODES[0]}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        >
          {PENALTY_CODES.map((code) => (
            <option key={code} value={code}>
              {PENALTY_CODE_LABELS[code]}
            </option>
          ))}
        </select>
        <FieldErrors messages={state.errors.type} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="duration">Duration (minutes)</label>
        <input
          id="duration"
          name="duration"
          type="number"
          min={1}
          defaultValue={initialValues?.duration}
          className="w-20 border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.duration} />
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
            : "Record penalty"}
      </button>
    </form>
  );
}
