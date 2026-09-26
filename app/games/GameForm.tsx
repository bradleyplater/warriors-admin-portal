"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Game, Player, Season } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  Card,
  Choice,
  FieldErrors,
  Fieldset,
  FormActions,
  FormErrorSummary,
  SelectField,
  TextField,
} from "@/app/_ui";
import { createGameAction, updateGameAction } from "./actions";
import { initialGameFormState, type GameFormState } from "./form-state";
import { RosterSelect } from "./RosterSelect";

const GAME_TYPES = ["CHALLENGE", "BOTBC", "LLIHC"] as const;

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Create mode's "who dressed" picker. The checkboxes stay uncontrolled form
// inputs — the count and Select all only read and set them.
function RosterPicker({
  activePlayers,
  errors,
}: {
  activePlayers: Player[];
  errors?: string[];
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);

  function recount() {
    setSelected(listRef.current?.querySelectorAll("input:checked").length ?? 0);
  }

  // React resets a form after its action settles, which unchecks every box
  // without firing change events. The reset event fires before the inputs
  // revert, so recount once it has applied.
  useEffect(() => {
    const form = listRef.current?.closest("form");
    if (!form) return;
    const onReset = () => queueMicrotask(recount);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  function selectAll() {
    listRef.current
      ?.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
      .forEach((input) => {
        input.checked = true;
      });
    recount();
  }

  return (
    <fieldset className="wr-fieldset gap-3">
      <legend className="wr-field__label mb-3">Roster · who dressed</legend>
      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-sunken px-4 py-2">
          <span className="t-data text-fg-secondary" aria-live="polite">
            {selected} of {activePlayers.length} selected
          </span>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select all
          </Button>
        </div>
        <div
          ref={listRef}
          onChange={recount}
          className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4 gap-y-2 p-4"
        >
          {activePlayers.map((player) => (
            <Choice
              key={player._id}
              type="checkbox"
              name="roster"
              value={player._id}
            >
              <span className="t-data text-fg-secondary">
                #{player.number ?? "—"}
              </span>
              {player.firstName} {player.surname}
            </Choice>
          ))}
        </div>
      </Card>
      <FieldErrors messages={errors} />
      <p className="m-0 text-sm text-fg-secondary">
        The netminder and both awards are set after the game, from the game
        page.
      </p>
    </fieldset>
  );
}

type GameFormProps = {
  seasons: Season[];
  // Only needed in create mode — the edit form doesn't touch the roster,
  // that's handled by RosterForm on its own route.
  activePlayers?: Player[];
  // Only needed in edit mode, for the netminder picker — the game's current
  // roster, resolved to Player records.
  rosterPlayers?: Player[];
  initialValues?: Game;
};

export function GameForm({
  seasons,
  activePlayers,
  rosterPlayers,
  initialValues,
}: GameFormProps) {
  const isEdit = initialValues !== undefined;
  const action = isEdit
    ? updateGameAction.bind(null, initialValues._id)
    : createGameAction;

  const [state, formAction, pending] = useActionState<GameFormState, FormData>(
    action,
    initialGameFormState,
  );

  const showRosterPicker = !isEdit && activePlayers !== undefined;

  return (
    <form
      action={formAction}
      className={
        showRosterPicker
          ? "grid items-start gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
          : "max-w-md"
      }
    >
      <div className="flex flex-col gap-5">
        <FormErrorSummary errors={state.errors} />

        <TextField
          id="date"
          name="date"
          label="Date"
          type="date"
          defaultValue={
            initialValues ? toDateInputValue(initialValues.date) : undefined
          }
          errors={state.errors.date}
          className="max-w-56"
        />

        <SelectField
          id="seasonId"
          name="seasonId"
          label="Season"
          defaultValue={initialValues?.seasonId}
          errors={state.errors.seasonId}
          className="max-w-56"
        >
          {seasons.map((season) => (
            <option key={season._id} value={season._id}>
              {season.name}
            </option>
          ))}
        </SelectField>

        <TextField
          id="opponentName"
          name="opponentName"
          label="Opponent"
          defaultValue={initialValues?.opponentTeam.name}
          errors={state.errors.opponentName}
        />

        <Fieldset legend="Game type" errors={state.errors.type}>
          {GAME_TYPES.map((type, index) => (
            <Choice
              key={type}
              type="radio"
              name="type"
              value={type}
              defaultChecked={
                initialValues ? initialValues.type === type : index === 0
              }
            >
              {type}
            </Choice>
          ))}
        </Fieldset>

        <Fieldset legend="Location" errors={state.errors.location}>
          <Choice
            type="radio"
            name="location"
            value="HOME"
            defaultChecked={
              initialValues ? initialValues.location === "HOME" : true
            }
          >
            Home
          </Choice>
          <Choice
            type="radio"
            name="location"
            value="AWAY"
            defaultChecked={initialValues?.location === "AWAY"}
          >
            Away
          </Choice>
        </Fieldset>

        {isEdit && rosterPlayers && (
          <RosterSelect
            id="netminderPlayerId"
            name="netminderPlayerId"
            label="Netminder"
            rosterPlayers={rosterPlayers}
            defaultValue={initialValues?.netminderPlayerId}
            errors={state.errors.netminderPlayerId}
          />
        )}

        <FormActions>
          <Button type="submit" size="lg" disabled={pending}>
            {pending
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create game"}
          </Button>
          <ButtonLink
            href={isEdit ? `/games/${initialValues._id}` : "/games"}
            variant="ghost"
            size="lg"
          >
            Cancel
          </ButtonLink>
        </FormActions>
      </div>

      {showRosterPicker && (
        <RosterPicker
          activePlayers={activePlayers}
          errors={state.errors.roster}
        />
      )}
    </form>
  );
}
