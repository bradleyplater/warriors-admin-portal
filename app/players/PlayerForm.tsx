"use client";

import { useActionState } from "react";
import { PositionSchema } from "@/lib/schemas/enums";
import { createPlayerAction } from "./actions";
import { initialCreatePlayerFormState } from "./form-state";

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

export function PlayerForm() {
  const [state, formAction, pending] = useActionState(
    createPlayerAction,
    initialCreatePlayerFormState,
  );

  return (
    <form
      key={state.resetToken}
      action={formAction}
      className="flex max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.firstName} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="surname">Surname</label>
        <input
          id="surname"
          name="surname"
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.surname} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="number">Shirt number</label>
        <input
          id="number"
          name="number"
          type="text"
          inputMode="numeric"
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.number} />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend>Positions</legend>
        {PositionSchema.options.map((position) => (
          <label key={position} className="flex items-center gap-2">
            <input type="checkbox" name="positions" value={position} />
            {position}
          </label>
        ))}
        <FieldErrors messages={state.errors.positions} />
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="active" defaultChecked />
        Active
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="nickname">Nickname (optional)</label>
        <input
          id="nickname"
          name="nickname"
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.nickname} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="imagePath">Image identifier (optional)</label>
        <input
          id="imagePath"
          name="imagePath"
          placeholder="e.g. plr100010.jpg"
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.imagePath} />
      </div>

      <FieldErrors messages={state.errors.form} />

      {state.success && (
        <p className="text-sm text-green-700 dark:text-green-500">
          Player created.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-white/20"
      >
        {pending ? "Creating…" : "Create player"}
      </button>
    </form>
  );
}
