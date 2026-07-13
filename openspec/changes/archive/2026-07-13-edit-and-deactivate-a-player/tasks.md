## 1. Form state and action plumbing

- [x] 1.1 Rename/generalize `CreatePlayerFormState` in `app/players/form-state.ts` to a shared `PlayerFormState` (or add an equivalent edit state type) reused by both create and edit.
- [x] 1.2 Add `updatePlayerAction(id, prevState, formData)` to `app/players/actions.ts`, parsing with `PlayerCreateInputSchema` the same way `createPlayerAction` does, calling `updatePlayer(id, parsed.data)`, catching `DuplicateShirtNumberError` into a field-level `number` error, and redirecting to `/players` with `revalidatePath("/players")` on success.

## 2. Shared PlayerForm component

- [x] 2.1 Add an `initialValues?: Player` prop (or equivalent) to `PlayerForm` and set `defaultValue`/`defaultChecked` on every field (firstName, surname, number, positions checkboxes, active, nickname, imagePath) from it when present.
- [x] 2.2 Add an `action` prop (or a `mode: "create" | "edit"` + `playerId` prop) so `PlayerForm` can be bound to either `createPlayerAction` or `updatePlayerAction(id, ...)` via `useActionState`.
- [x] 2.3 Parameterize the submit button label ("Create player" / "Save changes") and pending label based on mode.

## 3. Edit route

- [x] 3.1 Add `app/players/[id]/edit/page.tsx`: server component that loads the player via `getPlayer(id)` (404 / `notFound()` if missing) and renders `PlayerForm` in edit mode with the player as `initialValues`.

## 4. Roster table edit affordance

- [x] 4.1 Add an edit icon/link to each row in `app/players/page.tsx`'s `RosterTable`, pointing to `/players/${player._id}/edit`, without making the whole row clickable.
- [x] 4.2 Give the edit icon an accessible name (e.g. `aria-label="Edit {name}"`) and a `title` for hover affordance.

## 5. Tests

- [x] 5.1 Integration coverage for the update path: `updatePlayer` translates a duplicate-number collision into `DuplicateShirtNumberError` both when `number` itself is being changed and when only `active` is being flipped (reactivation into a taken number) — added to `tests/integration/repositories/players.test.ts`. (Uncovered a real bug in `updatePlayer`'s error translation along the way; fixed in `lib/repositories/players.ts`, see notes below.)
- [x] 5.2 E2E journey (`e2e/edit-player.spec.ts`): edit a field and verify it's reflected on `/players`; invalid edit rejected with the same validation as create; deactivating moves a player to the Inactive section and frees their number for reuse; reactivating into a number now held by another active player is blocked with a field-level error.

## 6. Spec sync

- [x] 6.1 Run through `openspec-archive-change` once implementation and tests pass, to merge the `player-management` and `roster-list` deltas into the main specs.
