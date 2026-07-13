"use client";

import { useActionState } from "react";
import { PositionSchema } from "@/lib/schemas/enums";
import type { Player } from "@/lib/schemas";
import { createPlayerAction, updatePlayerAction } from "./actions";
import { initialPlayerFormState, type PlayerFormState } from "./form-state";

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

type PlayerFormProps = {
  initialValues?: Player;
};

export function PlayerForm({ initialValues }: PlayerFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updatePlayerAction.bind(null, initialValues._id)
    : createPlayerAction;

  const [state, formAction, pending] = useActionState<PlayerFormState, FormData>(
    action,
    initialPlayerFormState,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          defaultValue={initialValues?.firstName}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.firstName} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="surname">Surname</label>
        <input
          id="surname"
          name="surname"
          defaultValue={initialValues?.surname}
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
          defaultValue={initialValues?.number}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.number} />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend>Positions</legend>
        {PositionSchema.options.map((position) => (
          <label key={position} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="positions"
              value={position}
              defaultChecked={initialValues?.positions.includes(position)}
            />
            {position}
          </label>
        ))}
        <FieldErrors messages={state.errors.positions} />
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initialValues ? initialValues.active : true}
        />
        Active
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="nickname">Nickname (optional)</label>
        <input
          id="nickname"
          name="nickname"
          defaultValue={initialValues?.nickname}
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
          defaultValue={initialValues?.imagePath}
          className="border border-black/20 rounded px-2 py-1 dark:border-white/20"
        />
        <FieldErrors messages={state.errors.imagePath} />
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
            : "Creating…"
          : isEdit
            ? "Save changes"
            : "Create player"}
      </button>
    </form>
  );
}
