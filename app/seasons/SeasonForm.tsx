"use client";

import { useActionState } from "react";
import { Button, ButtonLink, FormActions, TextField } from "@/app/_ui";
import { createSeasonAction } from "./actions";
import { initialSeasonFormState, type SeasonFormState } from "./form-state";

export function SeasonForm() {
  const [state, formAction, pending] = useActionState<
    SeasonFormState,
    FormData
  >(createSeasonAction, initialSeasonFormState);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-5">
      <TextField
        id="startYear"
        name="startYear"
        label="Start year"
        type="text"
        inputMode="numeric"
        placeholder="e.g. 2026"
        hint="The name is generated from the start year, e.g. 2026 becomes 26/27."
        errors={state.errors.startYear}
      />

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Create season"}
        </Button>
        <ButtonLink href="/seasons" variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
