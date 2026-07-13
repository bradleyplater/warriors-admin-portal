## 1. Roster list on `/players`

- [x] 1.1 In `app/players/page.tsx`, remove `<PlayerForm />` and the bare `<ul>` list; keep `listPlayers()` as the data source.
- [x] 1.2 Partition players into `active` / `inactive` arrays (sorted by `number` ascending within each) and render two table sections ("Active", "Inactive"), each row showing shirt number, name, position(s), and nickname if set.
- [x] 1.3 Add an "Add new player" link/button near the top of the page, above the table, linking to `/players/new`.
- [x] 1.4 Style roster rows with a hover state only — no `<a>`/`<Link>`/`onClick` navigation on rows.

## 2. Move create form to `/players/new`

- [x] 2.1 Create `app/players/new/page.tsx` rendering `<PlayerForm />` (reuse the existing component as-is initially).
- [x] 2.2 In `app/players/actions.ts`, change `createPlayerAction` to call `redirect("/players")` after a successful `createPlayer()` call, instead of returning `{ success: true, resetToken }`. Keep `revalidatePath("/players")` before the redirect. Ensure `redirect()`'s thrown `NEXT_REDIRECT` is not swallowed by the existing `try/catch` around `createPlayer()`.
- [x] 2.3 Shrink `CreatePlayerFormState` (`app/players/form-state.ts`) to drop `success` and `resetToken`; update `initialCreatePlayerFormState` accordingly.
- [x] 2.4 In `app/players/PlayerForm.tsx`, remove the `key={state.resetToken}` remount, the `state.success` confirmation message, and any now-unused state fields.

## 3. Spec-driven E2E coverage

- [x] 3.1 Rewrite `e2e/create-player.spec.ts`: navigate to `/players/new` instead of `/players` for each test; after a valid submission, assert the page redirected to `/players` and the created player's row appears in the correct table section.
- [x] 3.2 Update the validation-failure tests (non-numeric number, out-of-range number, no position, duplicate active number) to assert the admin stays on `/players/new` with the field-level error, and that no player row was created.
- [x] 3.3 Add a new roster-list E2E spec (e.g. `e2e/roster-list.spec.ts`) asserting: seeded players render on `/players`; at least one known-active seeded player appears in the "Active" section; at least one known-inactive seeded player (e.g. Sam Elliston, `#19`) appears in the "Inactive" section; the "Add new player" control navigates to `/players/new`.

## 4. Verification

- [x] 4.1 Run the full test suite and E2E suite; fix any fallout from the routing/state changes.
- [x] 4.2 Manually exercise the flow in a browser: view `/players`, click "Add new player", create a player, confirm redirect to `/players` and correct section placement.
