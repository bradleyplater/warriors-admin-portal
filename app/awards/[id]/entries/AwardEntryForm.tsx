"use client";

import { useActionState, useState } from "react";
import {
  AWARD_CATEGORIES,
  type AwardCategory,
  type AwardEntry,
  type Player,
} from "@/lib/schemas";
import { CUSTOM_AWARD } from "@/lib/awards/entry-form";
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
import { initialAwardFormState, type AwardFormState } from "../../form-state";
import { playerLabel } from "../../players";

// The catalogue as <optgroup>s, in catalogue order.
const CATEGORY_GROUPS = Object.entries(AWARD_CATEGORIES).reduce<
  { group: string; categories: [AwardCategory, string][] }[]
>((groups, [key, { name, group }]) => {
  const last = groups.at(-1);
  if (last?.group === group) {
    last.categories.push([key as AwardCategory, name]);
  } else {
    groups.push({ group, categories: [[key as AwardCategory, name]] });
  }
  return groups;
}, []);

export function AwardEntryForm({
  eveningId,
  entry,
  players,
  action,
  submitLabel,
}: {
  eveningId: string;
  // Absent when adding a new award.
  entry?: AwardEntry;
  players: { active: Player[]; inactive: Player[] };
  action: (
    state: AwardFormState,
    formData: FormData,
  ) => Promise<AwardFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAwardFormState,
  );
  const [award, setAward] = useState<string>(
    entry ? (entry.category ?? CUSTOM_AWARD) : "",
  );
  const winners = new Set(entry?.winners);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormErrorSummary errors={state.errors} />

      <SelectField
        id="award"
        name="award"
        label="Award"
        value={award}
        onChange={(event) => setAward(event.target.value)}
        errors={state.errors.award}
      >
        <option value="" disabled>
          Choose an award
        </option>
        {CATEGORY_GROUPS.map(({ group, categories }) => (
          <optgroup key={group} label={group}>
            {categories.map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </optgroup>
        ))}
        <optgroup label="Club awards">
          <option value={CUSTOM_AWARD}>Other — type a name</option>
        </optgroup>
      </SelectField>

      {award === CUSTOM_AWARD && (
        <TextField
          id="customName"
          name="customName"
          label="Award name"
          defaultValue={entry?.customName}
          hint="A one-off club award, e.g. Knockout of the year."
          errors={state.errors.customName}
        />
      )}

      <SelectField
        id="competition"
        name="competition"
        label="Competition"
        defaultValue={entry?.competition ?? ""}
        hint="Club-wide awards cover both competitions, like the coaches’ and manager’s honours."
        errors={state.errors.competition}
      >
        <option value="">Club-wide</option>
        <option value="BOTBC">BOTB</option>
        <option value="LLIHC">LLIHC</option>
      </SelectField>

      <Fieldset legend="Winner" errors={state.errors.winners}>
        <p className="wr-field__hint m-0 mb-3">
          Leave empty until the award is announced. Tick more than one for a
          shared award.
        </p>
        <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
          {(
            [
              ["Current squad", players.active],
              ["Former players", players.inactive],
            ] as const
          )
            .filter(([, group]) => group.length > 0)
            .map(([heading, group]) => (
              <div key={heading} className="flex flex-col gap-1">
                <span className="t-label text-fg-secondary">{heading}</span>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {group.map((player) => (
                    <Choice
                      key={player._id}
                      type="checkbox"
                      name="winners"
                      value={player._id}
                      defaultChecked={winners.has(player._id)}
                    >
                      {playerLabel(player)}
                    </Choice>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </Fieldset>

      <TextField
        id="note"
        name="note"
        label="Note (optional)"
        defaultValue={entry?.note}
        hint="Shown under the winner in the roll of honour, e.g. Named for 2026/27."
        errors={state.errors.note}
      />

      <FormActions>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <ButtonLink href={`/awards/${eveningId}`} variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </FormActions>
    </form>
  );
}
