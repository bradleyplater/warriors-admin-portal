"use client";

import { useActionState } from "react";
import { createSeasonAction } from "./actions";
import { initialSeasonFormState, type SeasonFormState } from "./form-state";

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

export function SeasonForm() {
  const [state, formAction, pending] = useActionState<SeasonFormState, FormData>(
    createSeasonAction,
    initialSeasonFormState,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="startYear">Start year</label>
        <input
          id="startYear"
          name="startYear"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 2026"
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.startYear} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/20"
      >
        {pending ? "Creating…" : "Create season"}
      </button>
    </form>
  );
}
