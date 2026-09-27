"use client";

import { useActionState } from "react";
import type { Opponent } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  FormActions,
  FormErrorSummary,
  TextField,
} from "@/app/_ui";
import { createOpponentAction, updateOpponentAction } from "./actions";
import { initialOpponentFormState, type OpponentFormState } from "./form-state";

const LOGO_ACCEPT = "image/svg+xml,image/png,image/jpeg,image/webp";

type OpponentFormProps = {
  initialValues?: Opponent;
};

export function OpponentForm({ initialValues }: OpponentFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateOpponentAction.bind(null, initialValues._id)
    : createOpponentAction;

  const [state, formAction, pending] = useActionState<
    OpponentFormState,
    FormData
  >(action, initialOpponentFormState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <FormErrorSummary errors={state.errors} />

      <TextField
        id="name"
        name="name"
        label="Name"
        defaultValue={initialValues?.name}
        errors={state.errors.name}
      />

      <TextField
        id="logo"
        name="logo"
        type="file"
        accept={LOGO_ACCEPT}
        label={
          isEdit && initialValues.logo
            ? "Replace logo (optional)"
            : "Logo (optional)"
        }
        hint="SVG, PNG, JPEG, or WebP, up to 5 MB."
        errors={state.errors.logo}
      />

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : "Create opponent"}
        </Button>
        <ButtonLink href="/opponents" variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
