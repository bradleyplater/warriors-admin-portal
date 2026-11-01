"use client";

import { useActionState } from "react";
import type { Season } from "@/lib/schemas";
import { Button, SelectField } from "@/app/_ui";
import { createAwardEveningAction } from "./actions";
import { initialAwardFormState, type AwardFormState } from "./form-state";

// Only offered seasons without an evening — each season has at most one.
export function NewEveningForm({ seasons }: { seasons: Season[] }) {
  const [state, formAction, pending] = useActionState<AwardFormState, FormData>(
    createAwardEveningAction,
    initialAwardFormState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <SelectField
        id="seasonId"
        name="seasonId"
        label="Season"
        defaultValue={seasons[0]?._id}
        errors={state.errors.seasonId}
      >
        {seasons.map((season) => (
          <option key={season._id} value={season._id}>
            {season.name}
          </option>
        ))}
      </SelectField>
      <Button
        type="submit"
        disabled={pending}
        className="mb-[var(--wr-space-1)]"
      >
        {pending ? "Creating…" : "Create awards evening"}
      </Button>
    </form>
  );
}
