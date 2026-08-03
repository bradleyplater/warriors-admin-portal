## 1. Form parsing

- [x] 1.1 In `app/games/form-parsing.ts`, add `parseGameAwardsFormData(formData, existing)` that reads `manOfTheMatchPlayerId` and `warriorOfTheGamePlayerId` (each optional, `""` → `undefined`, same pattern as `optionalFormString` used for `assist1`/`assist2`), and validates via `GameCreateInputSchema.safeParse` carrying over `existing.team`/`existing.opponentTeam`/other fields unchanged (mirror `parseGameDetailsFormData`'s carry-over approach, but only the two award fields are settable here).
  - **Revised after initial implementation**: netminder was originally a third field on this parser/form. Moved to `parseGameDetailsFormData`/`GameForm.tsx` instead — netminder isn't an award (no derived count, nothing "won"), it's a game detail like date or location. See design.md's Decisions.
- [x] 1.2 Add/extend `fieldKeyFor` mapping if any award-field Zod issue paths need remapping to form field names.
  - Confirmed unchanged: `fieldKeyFor`'s `typeof first === "string"` fallback already returns the flat field name as-is; covered by the "rejects a non-rostered playerId" unit tests in section 5.

## 2. Server action

- [x] 2.1 In `app/games/actions.ts`, add `updateGameAwardsAction(id, _prevState, formData)`: fetch the existing game (404-style `{ errors: { form: [...] } }` if missing, matching `updateGameAction`'s pattern), parse with `parseGameAwardsFormData`, call `updateGame(id, { manOfTheMatchPlayerId, warriorOfTheGamePlayerId })`, `revalidatePath` for `/games/[id]` and `/games/[id]/awards`, then redirect to `/games/[id]`.
  - Maps an unselected award to `null` (not `undefined`) when calling `updateGame`, per the fix in 2.2.
- [x] 2.2 Confirm `updateGame`'s patch type (`lib/repositories/games.ts`) already accepts these fields as optional/undefined-clearing.
  - **Did not hold up**: confirmed (via `bson`/`mongodb` internals) that `undefined` there means "leave unchanged," and the Mongo driver's `ignoreUndefined: false` default would have serialized an explicit `undefined` as BSON `null` on `replaceOne` — which `GameSchema` rejects on the next read. Fixed `GameUpdateInput`'s netminder/award fields to `string | null | undefined` (`null` = explicit clear, deletes the key) and added a regression test in `tests/integration/repositories/games.test.ts` proving set → clear → re-read round-trips against a real local MongoDB. See design.md's Decisions.

## 3. Awards form and page

- [x] 3.1 Create `app/games/AwardsForm.tsx` (client component, `useActionState` + `updateGameAwardsAction.bind(null, game._id)`, same shape as `RosterForm.tsx`): two `<select>` fields (Player of the Game, Warrior of the Game), each with a "None" option plus one option per player in `game.team.roster` (resolved to `Player` records), `defaultValue` from the game's current award fields. Extracted the shared select widget into `app/games/RosterSelect.tsx` since GameForm's netminder field (section 4a) needs the identical widget.
- [x] 3.2 In the same component (or the page), render the empty-roster message ("Add players to the roster first") instead of the selects when `game.team.roster` is empty.
- [x] 3.3 Create `app/games/[id]/awards/page.tsx`: fetch the game (404 via `notFound()` if missing, matching `roster/page.tsx`), resolve roster players, render `AwardsForm`.
- [x] 3.4 Create `app/games/[id]/awards/page.test.ts` mirroring `roster/page.test.ts`'s coverage style.
  - Scope matched to the actual precedent: `roster/page.test.ts` and `[id]/page.test.ts` only cover the 404 path (rendering/selection behavior is covered by Playwright, not RSC unit tests in this codebase) — `awards/page.test.ts` does the same.

## 4. Game details form: netminder

- [x] 4a.1 Added after initial implementation moved netminder off the awards form. In `app/games/GameForm.tsx`, add an optional `rosterPlayers?: Player[]` prop and render a "Netminder" `RosterSelect` when `isEdit && rosterPlayers` (create mode never shows it — a game has no roster to pick a netminder from until it exists).
- [x] 4a.2 In `app/games/[id]/edit/page.tsx`, fetch `listPlayers()` alongside `listSeasons()`, resolve `game.team.roster` to `Player` records, and pass as `rosterPlayers` to `GameForm`.
- [x] 4a.3 In `app/games/form-parsing.ts`, `parseGameDetailsFormData` reads `netminderPlayerId` from the submitted form (always present in edit mode) instead of carrying over `existing.netminderPlayerId` unchanged.
- [x] 4a.4 In `app/games/actions.ts`, `updateGameAction` passes `netminderPlayerId: parsed.data.netminderPlayerId ?? null` to `updateGame`, same clear-sentinel handling as the awards action.
- [x] 4a.5 Updated `app/games/[id]/edit/page.test.ts`'s repository mock to include `listPlayers`.

## 5. Game detail page

- [x] 5.1 In `app/games/[id]/page.tsx`, add a "Manage awards" link to `/games/${game._id}/awards` alongside the existing "Edit details" / "Manage roster" links.
- [x] 5.2 Show Netminder in the existing details `<dl>` (alongside Date/Season/Type/Location) and a separate "Awards" heading + `<dl>` for Player of the Game and Warrior of the Game — not one combined "Awards" section, since netminder isn't an award. Each resolved via `playerLabel`/`optionalPlayerLabel` when set or "Not set" when `undefined`.
- [x] 5.3 `app/games/[id]/page.test.ts` unchanged: this file only covers the 404 path (see 3.4's note); the new link, netminder/award rendering, and "Not set" defaults are exercised by the E2E spec instead, consistent with this codebase's existing split between unit and E2E coverage for this page.

## 6. Unit tests for parsing

- [x] 6.1 Unit tests for `parseGameDetailsFormData`'s netminder handling in `app/games/form-parsing.test.ts`: setting to a rostered player, clearing via empty select, rejecting a non-rostered playerId (defense-in-depth, since the picker itself only offers rostered ids).
- [x] 6.2 Unit tests for `parseGameAwardsFormData` in `app/games/form-parsing.test.ts`: setting each award to a rostered player, clearing an award, rejecting a non-rostered playerId, setting the same player for both awards, and confirming it never touches the netminder field.

## 7. E2E journey

- [x] 7.1 `e2e/select-netminder-and-game-awards.spec.ts`, first test: create a game, set the netminder via `/games/[id]/edit`, verify it renders on `/games/[id]`; verify there is no netminder selector on `/games/[id]/awards`; clear the netminder via `/games/[id]/edit` and verify it reverts to "Not set".
- [x] 7.2 Second test: roster two players, set Player of the Game and Warrior of the Game via `/games/[id]/awards`, verify both render on `/games/[id]`.
- [x] 7.3 In the same test, reassign Player of the Game to a different rostered player and verify the season "Man of the Match" count on `/players/[id]` moves from the original player back down and the new one up (delta-based, per the existing `record-and-edit-goals.spec.ts` convention — every active player is already rostered in seeded games, so there's no clean zero baseline to assert against).
- [x] 7.4 Clear Warrior of the Game and verify the previously selected player's "Warrior of the Game" count on `/players/[id]` returns to its pre-test value and the game page shows "Not set".

## 8. Validation

- [x] 8.1 Ran `npm run typecheck` (clean), `npx eslint` (clean), `test:unit` (158 passed), `test:integration` (52 passed, including the award/netminder-clearing regression test against real MongoDB), and the full `test:e2e` suite with `--workers=1` after a clean `db:reset` and a forced rebuild (killed the stale dev server on :3000 so Playwright's `webServer` actually rebuilt) — 43/43 passed, including both new spec cases and the existing `edit-game-and-manage-roster.spec.ts` suite.
