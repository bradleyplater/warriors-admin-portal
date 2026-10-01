"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { Opponent, UpcomingGame } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  Choice,
  Fieldset,
  FormActions,
  FormErrorSummary,
  SelectField,
  TextField,
} from "@/app/_ui";
import {
  createUpcomingGameAction,
  updateUpcomingGameAction,
} from "./actions";
import {
  initialUpcomingGameFormState,
  type UpcomingGameFormState,
} from "./form-state";

export const COMPETITIONS = [
  { value: "CHALLENGE", label: "Challenge" },
  { value: "LLIHC", label: "LLIHC" },
  { value: "BOTBC", label: "BOTBC" },
] as const;

type UpcomingGameFormProps = {
  // Sorted by name. Opponents are only created on the Opponents page.
  opponents: Opponent[];
  initialValues?: UpcomingGame;
};

export function UpcomingGameForm({ opponents, initialValues }: UpcomingGameFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateUpcomingGameAction.bind(null, initialValues._id)
    : createUpcomingGameAction;

  const [state, formAction, pending] = useActionState<UpcomingGameFormState, FormData>(
    action,
    initialUpcomingGameFormState,
  );

  // A form `action` makes React reset the form once it settles, which also
  // unchecks controlled radios. Dispatching from onSubmit skips that reset,
  // so a submit that comes back with errors keeps everything entered.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const [values, setValues] = useState({
    opponentId: initialValues?.opponentId ?? "",
    date: initialValues?.date ?? "",
    time: initialValues?.time ?? "",
    location: initialValues?.location ?? "HOME",
    venue: initialValues?.venue ?? "",
    type: initialValues?.type ?? "CHALLENGE",
  });
  function set(field: keyof typeof values) {
    return (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
      <FormErrorSummary errors={state.errors} />

      <SelectField
        id="opponentId"
        name="opponentId"
        label="Opponent"
        value={values.opponentId}
        onChange={set("opponentId")}
        errors={state.errors.opponentId}
        hint={
          opponents.length === 0 ? (
            <>
              No opponents yet — <Link href="/opponents/new">add one first</Link>.
            </>
          ) : (
            <>
              Missing one? <Link href="/opponents/new">Add an opponent</Link>.
            </>
          )
        }
      >
        <option value="" disabled>
          Select an opponent
        </option>
        {opponents.map((opponent) => (
          <option key={opponent._id} value={opponent._id}>
            {opponent.name}
          </option>
        ))}
      </SelectField>

      <div className="flex flex-wrap gap-5">
        <TextField
          id="date"
          name="date"
          label="Date"
          type="date"
          value={values.date}
          onChange={set("date")}
          errors={state.errors.date}
          className="max-w-56"
        />
        <TextField
          id="time"
          name="time"
          label="Face-off"
          type="time"
          value={values.time}
          onChange={set("time")}
          errors={state.errors.time}
          className="max-w-40"
        />
      </div>

      <Fieldset legend="Location" errors={state.errors.location}>
        <Choice
          type="radio"
          name="location"
          value="HOME"
          checked={values.location === "HOME"}
          onChange={set("location")}
        >
          Home
        </Choice>
        <Choice
          type="radio"
          name="location"
          value="AWAY"
          checked={values.location === "AWAY"}
          onChange={set("location")}
        >
          Away
        </Choice>
      </Fieldset>

      {values.location === "AWAY" && (
        <TextField
          id="venue"
          name="venue"
          label="Venue"
          value={values.venue}
          onChange={set("venue")}
          errors={state.errors.venue}
          hint="The rink, e.g. Riverside Leisure Centre."
        />
      )}

      <SelectField
        id="type"
        name="type"
        label="Competition"
        value={values.type}
        onChange={set("type")}
        errors={state.errors.type}
        className="max-w-56"
      >
        {COMPETITIONS.map((competition) => (
          <option key={competition.value} value={competition.value}>
            {competition.label}
          </option>
        ))}
      </SelectField>

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : "Add upcoming game"}
        </Button>
        <ButtonLink href="/upcoming-games" variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
