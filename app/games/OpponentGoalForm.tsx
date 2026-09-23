"use client";

import { useActionState } from "react";
import { GOAL_TYPE_LABELS } from "@/lib/schemas";
import type { OpponentGoal } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  FormActions,
  FormErrorSummary,
  SelectField,
  TextField,
} from "@/app/_ui";
import { addOpponentGoalAction, updateOpponentGoalAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";
import { TimeFields } from "./TimeFields";

const GOAL_TYPES = Object.keys(
  GOAL_TYPE_LABELS,
) as (keyof typeof GOAL_TYPE_LABELS)[];

type OpponentGoalFormProps = {
  gameId: string;
  initialValues?: OpponentGoal;
};

export function OpponentGoalForm({
  gameId,
  initialValues,
}: OpponentGoalFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateOpponentGoalAction.bind(null, gameId, initialValues._id)
    : addOpponentGoalAction.bind(null, gameId);

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <FormErrorSummary errors={state.errors} />

      <TextField
        id="scoredBy"
        name="scoredBy"
        label="Scorer"
        type="text"
        defaultValue={initialValues?.scoredBy}
        errors={state.errors.scoredBy}
      />

      <TimeFields errors={state.errors} initialValues={initialValues} />

      <SelectField
        id="type"
        name="type"
        label="Type"
        defaultValue={initialValues?.type ?? GOAL_TYPES[0]}
        errors={state.errors.type}
      >
        {GOAL_TYPES.map((type) => (
          <option key={type} value={type}>
            {GOAL_TYPE_LABELS[type]}
          </option>
        ))}
      </SelectField>

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? isEdit
              ? "Saving…"
              : "Recording…"
            : isEdit
              ? "Save changes"
              : "Record goal"}
        </Button>
        <ButtonLink href={`/games/${gameId}`} variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
