"use client";

import { useActionState } from "react";
import { PositionSchema } from "@/lib/schemas/enums";
import type { Player } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  Choice,
  Fieldset,
  FormActions,
  FormErrorSummary,
  TextField,
} from "@/app/_ui";
import { createPlayerAction, updatePlayerAction } from "./actions";
import { initialPlayerFormState, type PlayerFormState } from "./form-state";

type PlayerFormProps = {
  initialValues?: Player;
};

export function PlayerForm({ initialValues }: PlayerFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updatePlayerAction.bind(null, initialValues._id)
    : createPlayerAction;

  const [state, formAction, pending] = useActionState<
    PlayerFormState,
    FormData
  >(action, initialPlayerFormState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <FormErrorSummary errors={state.errors} />

      <TextField
        id="firstName"
        name="firstName"
        label="First name"
        defaultValue={initialValues?.firstName}
        errors={state.errors.firstName}
      />

      <TextField
        id="surname"
        name="surname"
        label="Surname"
        defaultValue={initialValues?.surname}
        errors={state.errors.surname}
      />

      <TextField
        id="number"
        name="number"
        label="Shirt number"
        type="text"
        inputMode="numeric"
        defaultValue={initialValues?.number}
        errors={state.errors.number}
        className="max-w-40"
      />

      <Fieldset legend="Positions" errors={state.errors.positions}>
        {PositionSchema.options.map((position) => (
          <Choice
            key={position}
            type="checkbox"
            name="positions"
            value={position}
            defaultChecked={initialValues?.positions.includes(position)}
          >
            {position}
          </Choice>
        ))}
      </Fieldset>

      <Choice
        type="checkbox"
        name="active"
        defaultChecked={initialValues ? initialValues.active : true}
      >
        Active
      </Choice>

      <TextField
        id="nickname"
        name="nickname"
        label="Nickname (optional)"
        defaultValue={initialValues?.nickname}
        errors={state.errors.nickname}
      />

      <TextField
        id="imagePath"
        name="imagePath"
        label="Image identifier (optional)"
        placeholder="e.g. plr100010.jpg"
        defaultValue={initialValues?.imagePath}
        errors={state.errors.imagePath}
      />

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : "Create player"}
        </Button>
        <ButtonLink
          href={isEdit ? `/players/${initialValues._id}` : "/players"}
          variant="ghost"
          size="lg"
        >
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
