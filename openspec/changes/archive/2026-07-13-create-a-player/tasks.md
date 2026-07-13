## 1. Branch setup

- [x] 1.1 Rebase the `KAN-15` branch onto `main` so `lib/repositories/players.ts` and `lib/schemas/player.ts` (KAN-13/14) are present.

## 2. Schema correction (imageUrl → imagePath)

- [x] 2.1 In `lib/schemas/player.ts`, replace `imageUrl: z.url().optional()` with `imagePath: z.string().min(1).optional()`.
- [x] 2.2 Update `lib/schemas/player.test.ts` to cover `imagePath` instead of `imageUrl` (accepts a bare identifier; no longer requires a URL shape).
- [x] 2.3 Update `seed/data/players.ts` fixture(s) using `imageUrl` to use `imagePath` with a bare filename (e.g. `"plr100010.jpg"`).
- [x] 2.4 Update `seed/types.ts` `imageUrl?: string` field to `imagePath?: string`.
- [x] 2.5 Update `docs/03-data-model.md`'s `imageUrl` reference to `imagePath`, describing it as an S3 object key/filename, not a full URL.

## 3. Create-player server action

- [x] 3.0 Add `getTheTeam()` to `lib/repositories/team.ts` (reads the sole team document without requiring its id upfront) — discovered during implementation: the form needs a `teamId` to create a player, and no existing code resolves the single team's id outside seed fixtures.
- [x] 3.1 Add a server action (e.g. `app/players/actions.ts`, `"use server"`) that reads submitted `FormData`, builds a candidate object (including `positions` via `formData.getAll("positions")` and `active` via checkbox presence), and parses it with `PlayerCreateInputSchema`.
- [x] 3.2 On schema validation failure, return a field-errors object (e.g. from `error.flatten().fieldErrors`) without calling the repository.
- [x] 3.3 On validation success, call `createPlayer()` from `lib/repositories/players.ts`.
- [x] 3.4 Catch `DuplicateShirtNumberError` from `createPlayer()` and return it as a field-level error keyed to `number`, in the same shape as a schema validation error.
- [x] 3.5 On success, call `revalidatePath("/players")` and return a success result.

## 4. Create-player form UI

- [x] 4.1 Build the form component under `app/players/` (client component) using `useActionState` bound to the server action from 3.1.
- [x] 4.2 Add inputs: first name, surname, shirt number, three position checkboxes (Forward/Defence/Goaltender), active checkbox (defaulted checked), optional nickname, optional image identifier text field.
- [x] 4.3 Render field-level errors returned by the action next to their corresponding inputs.
- [x] 4.4 Render a success confirmation when the action reports success (e.g. reset the form).

## 5. Minimal player list

- [x] 5.1 Convert `app/players/page.tsx` from the placeholder into a Server Component that calls `listPlayers()` from `lib/repositories/players.ts`.
- [x] 5.2 Render each player's `firstName + " " + surname` and `number` only — no positions, active state, nickname, image, sorting, or styling beyond basic legibility.
- [x] 5.3 Render the create-player form (section 4) above or alongside the list on the same page.

## 6. Spec sync

- [ ] 6.1 Verify `openspec/specs/portal-shell/spec.md`'s "Placeholder area pages" requirement, once synced, no longer includes `/players`.

## 7. Tests

- [x] 7.1 Update/add unit tests for `PlayerCreateInputSchema`'s `imagePath` field (covered by 2.2).
- [x] 7.2 Add a Playwright E2E spec covering: valid creation appears in the list; non-numeric shirt number rejected; out-of-range shirt number rejected; empty positions rejected; duplicate active shirt number rejected (seed or create a conflicting active player first).
- [x] 7.3 Run `npm run test:unit`, `npm run test:integration` (requires local Docker stack per KAN-9), and `npm run test:e2e`; fix any failures.
- [x] 7.4 Run `npm run typecheck` and `npm run lint`.
