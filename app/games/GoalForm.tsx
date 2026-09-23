"use client";

import { useActionState } from "react";
import { GOAL_TYPE_LABELS } from "@/lib/schemas";
import type { Goal, Player } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  FormActions,
  FormErrorSummary,
  SelectField,
} from "@/app/_ui";
import { addGoalAction, updateGoalAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";
import { TimeFields } from "./TimeFields";

const GOAL_TYPES = Object.keys(
  GOAL_TYPE_LABELS,
) as (keyof typeof GOAL_TYPE_LABELS)[];

type GoalFormProps = {
  gameId: string;
  rosterPlayers: Player[];
  initialValues?: Goal;
};

function PlayerOptions({ players }: { players: Player[] }) {
  return players.map((player) => (
    <option key={player._id} value={player._id}>
      #{player.number ?? "—"} {player.firstName} {player.surname}
    </option>
  ));
}

export function GoalForm({
  gameId,
  rosterPlayers,
  initialValues,
}: GoalFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateGoalAction.bind(null, gameId, initialValues._id)
    : addGoalAction.bind(null, gameId);

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <FormErrorSummary errors={state.errors} />

      <SelectField
        id="scoredBy"
        name="scoredBy"
        label="Scorer"
        defaultValue={initialValues?.scoredBy}
        errors={state.errors.scoredBy}
      >
        <PlayerOptions players={rosterPlayers} />
      </SelectField>

      <SelectField
        id="assist1"
        name="assist1"
        label="Assist 1"
        defaultValue={initialValues?.assist1 ?? ""}
        errors={state.errors.assist1}
      >
        <option value="">None</option>
        <PlayerOptions players={rosterPlayers} />
      </SelectField>

      <SelectField
        id="assist2"
        name="assist2"
        label="Assist 2"
        defaultValue={initialValues?.assist2 ?? ""}
        errors={state.errors.assist2}
      >
        <option value="">None</option>
        <PlayerOptions players={rosterPlayers} />
      </SelectField>

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
