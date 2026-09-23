"use client";

import { useActionState } from "react";
import { PENALTY_CODE_LABELS } from "@/lib/schemas";
import type { OpponentPenalty } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  FormActions,
  FormErrorSummary,
  SelectField,
  TextField,
} from "@/app/_ui";
import {
  addOpponentPenaltyAction,
  updateOpponentPenaltyAction,
} from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";
import { TimeFields } from "./TimeFields";

const PENALTY_CODES = Object.keys(
  PENALTY_CODE_LABELS,
) as (keyof typeof PENALTY_CODE_LABELS)[];

type OpponentPenaltyFormProps = {
  gameId: string;
  initialValues?: OpponentPenalty;
};

export function OpponentPenaltyForm({
  gameId,
  initialValues,
}: OpponentPenaltyFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateOpponentPenaltyAction.bind(null, gameId, initialValues._id)
    : addOpponentPenaltyAction.bind(null, gameId);

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <FormErrorSummary errors={state.errors} />

      <TextField
        id="offender"
        name="offender"
        label="Offender"
        type="text"
        defaultValue={initialValues?.offender}
        errors={state.errors.offender}
      />

      <TimeFields errors={state.errors} initialValues={initialValues} />

      <SelectField
        id="type"
        name="type"
        label="Type"
        defaultValue={initialValues?.type ?? PENALTY_CODES[0]}
        errors={state.errors.type}
      >
        {PENALTY_CODES.map((code) => (
          <option key={code} value={code}>
            {PENALTY_CODE_LABELS[code]}
          </option>
        ))}
      </SelectField>

      <TextField
        id="duration"
        name="duration"
        label="Duration (minutes)"
        type="number"
        min={1}
        defaultValue={initialValues?.duration}
        errors={state.errors.duration}
        className="w-40"
      />

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? isEdit
              ? "Saving…"
              : "Recording…"
            : isEdit
              ? "Save changes"
              : "Record penalty"}
        </Button>
        <ButtonLink href={`/games/${gameId}`} variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
