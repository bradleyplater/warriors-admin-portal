## 1. Unit tests — pure/branching functions

> `fieldKeyFor`, `mapFieldErrors`, `parseGameFormData` (games) and `optionalString`, `parsePlayerFormData` (players) were moved out of their `"use server"` action files into new plain modules `app/games/form-parsing.ts` and `app/players/form-parsing.ts` — a `"use server"` file may only export async functions (confirmed via a real `next build` failure: "Server Actions must be async functions"), so they couldn't be exported for direct testing in place. `actions.ts` in both directories now imports them; no behavior changed. `vitest.config.ts` also gained the `@` path alias (matching `vitest.integration.config.ts` and `tsconfig.json`), needed for these new modules' `@/lib/schemas` imports to resolve under Vitest.

- [x] 1.1 `lib/derived/season-order.test.ts`: test `sortSeasonsAscending` directly (unordered input sorts ascending by id; empty array; already-sorted input is unchanged; input array is not mutated)
- [x] 1.2 `app/games/form-parsing.test.ts`: test `fieldKeyFor` directly for each mapped path shape (`["team","roster",n,"playerId"]` → `"roster"`, `["opponentTeam","name"]` → `"opponentName"`, a plain top-level string key, and an unmapped/unknown path → `"form"`)
- [x] 1.3 `app/games/form-parsing.test.ts`: test `mapFieldErrors` directly against a Zod error with multiple issues (including a nested roster path) and assert each issue lands under the correct mapped key, with multiple messages on the same key accumulating
- [x] 1.4 `app/games/form-parsing.test.ts`: test `parseGameFormData` directly — valid FormData parses to the expected schema input; missing/empty date yields `undefined` rather than an invalid Date; roster checkboxes map to the expected roster array shape
- [x] 1.5 `app/players/form-parsing.test.ts`: test `optionalString` directly — a present non-empty value passes through trimmed; an empty string, whitespace-only string, and non-string/null input all yield `undefined`
- [x] 1.6 `app/players/form-parsing.test.ts`: test `parsePlayerFormData` directly — valid FormData parses to the expected schema input; omitted nickname/imagePath are absent from the parsed object (not set to `undefined`), matching the BSON-null comment in the source

## 2. Not-found path tests

- [x] 2.1 Test that `/games/[id]` renders a 404 (not a crash or empty page) for an id with no matching game document
- [x] 2.2 Test that `/players/[id]` renders a 404 for an id with no matching player document
- [x] 2.3 Test that `/players/[id]/edit` renders a 404 for an id with no matching player document

## 3. Freshness regression test (force-dynamic)

> `e2e/games-freshness.spec.ts` loads `.env.local` (mirroring `tests/integration/setup.ts`) and calls `createSeason` from `@/lib/repositories` directly to write a season the same way an integration test would — there's no season-creation UI to drive instead.

- [x] 3.1 E2e test: against a running production build (`next build` + `next start`), create a game after the server has started and confirm it appears on `/games` in the correct season section without a rebuild
- [x] 3.2 E2e test: against a running production build, add a season and an active player after the server has started and confirm both appear as selectable options on `/games/new` without a rebuild

## 4. Create-game validation-failure E2E coverage

- [x] 4.1 `e2e/create-game.spec.ts`: missing date is rejected with a field-level error and no game is created
- [x] 4.2 `e2e/create-game.spec.ts`: missing opponent name is rejected with a field-level error and no game is created

> Deferred to KAN-46, not part of this change: "missing season" and "empty roster" rejection tests. Both were planned here but `GameCreateInputSchema` currently accepts an empty `seasonId` and an empty `roster` (no `.min(1)` on either) — confirmed empirically while writing these tests. That's a behavior gap against the `game-management` spec's existing "Required fields must be present" scenario, not a missing test, so it was split into KAN-46 (schema fix + its own tests) rather than fixed inline here.

## 5. Verify the tests actually catch regressions

- [x] 5.1 For each of the ten tests above, confirm it passes against current code
- [x] 5.2 Spot-check the red state on a sample of the risky ones: temporarily revert the `notFound()` call on `/games/[id]`, the `fieldKeyFor` roster mapping, and `force-dynamic` on `/games` and separately on `/games/new` — confirm the corresponding test fails each time, then restore the code
- [x] 5.3 Run `npm run test:unit`, `npm run test:integration`, and `npm run test:e2e` locally and confirm everything passes together

> Finding from 5.2, worth recording: removing `force-dynamic` from `/games` did **not** fail the new freshness test — `createGameAction`'s existing `revalidatePath("/games")` already invalidates that page's cache regardless of static/dynamic rendering, so `/games`'s freshness is actually protected by the revalidate call, not the `force-dynamic` export. Removing `force-dynamic` from `/games/new` **did** fail its freshness test (confirmed for both the season and the active-player scenario) — no code path ever calls `revalidatePath("/games/new")`, so that page's freshness genuinely depends on the export. Both tests are kept as written (they correctly assert real, current behavior either way); this is a note about which mechanism is actually load-bearing, not a defect.
>
> Also hit one unrelated flake during verification: a `CI=1` forced-rebuild run had `create-player.spec.ts`'s first test fail once under 6-worker parallelism, then pass cleanly both in isolation and in a full non-CI-forced rerun immediately after. Not caused by this change (no file this change touches is in that test's path) and not chased further, since it didn't reproduce.

## 6. Spec sync

- [x] 6.1 Confirm the delta specs in this change (`automated-testing`, `game-management`, `player-profile`, `player-management`) accurately describe the behavior now under test, ready for `openspec archive` / spec sync once KAN-44 is merged
