## 1. Score derivation helper

- [x] 1.1 Add `lib/derived/score.ts` implementing the score formula from `docs/03-data-model.md`: team/opponent score = count of non-SO goals for that side, +1 to whichever side scored a shootout (`SO`) goal, if any exist.
- [x] 1.2 Add unit tests covering: no goals (0-0), only regulation goals, a shootout decider, and both sides scoring.

## 2. Create-game server action

- [x] 2.1 Add `app/games/actions.ts` (`"use server"`) with a `createGameAction` that reads submitted `FormData`, resolves the team via `getTheTeam()`, builds a candidate object (roster via `formData.getAll("roster")`, empty `team.goals`/`team.penalties`/`opponentTeam.goals`/`opponentTeam.penalties` arrays, no netminder/award fields), and parses it with `GameCreateInputSchema`.
- [x] 2.2 On schema validation failure, return a field-errors object without calling the repository. (Implemented as a custom path-to-field mapper rather than `.flatten().fieldErrors`, since `GameCreateInputSchema`'s cross-field roster rules report nested paths like `["team","roster",1,"playerId"]` that `.flatten()` would not bucket usefully.)
- [x] 2.3 On validation success, call `createGame()` from `lib/repositories/games.ts`.
- [x] 2.4 On success, call `revalidatePath("/games")` and redirect to `/games/[id]` for the newly created game.

## 3. Create-game form UI

- [x] 3.1 Build a form component under `app/games/` (client component) using `useActionState` bound to `createGameAction`, rendered at `/games/new`.
- [x] 3.2 Add inputs: date, season (`<select>` populated from `listSeasons()`), opponent name (text), game type (radio/select offering only `CHALLENGE`, `BOTBC`, `LLIHC`), location (`HOME`/`AWAY`), roster picker (checkboxes over `listPlayers()` filtered to `active: true` in-memory).
- [x] 3.3 Render field-level errors returned by the action next to their corresponding inputs.

## 4. Games list page

- [x] 4.1 Convert `app/games/page.tsx` from the placeholder into a Server Component that calls `listGames()` and `listSeasons()`.
- [x] 4.2 Group games by `seasonId` in memory; render one section per season from `listSeasons()`, ordered ascending by season, each showing a games-played count and rendering even when empty.
- [x] 4.3 Render each game as a whole-row link to `/games/[id]` showing date, opponent name, and the derived score (via `lib/derived/score.ts`). (Implemented with the "stretched link" CSS pattern — an absolutely-positioned `Link` filling a `position: relative` `<tr>` — so the table stays a real `<table>`/`<tr>` structure rather than switching to a non-table clickable layout.)
- [x] 4.4 Add an "Add game" control linking to `/games/new`.

## 5. Game detail page

- [x] 5.1 Add `app/games/[id]/page.tsx` as a Server Component calling `getGame(id)`.
- [x] 5.2 Render date, season name (resolve via `listSeasons()`/`getSeason()`), opponent name, game type, location, and the roster (resolve player names/numbers via `listPlayers()`).
- [x] 5.3 Handle a missing/unknown game id (e.g. Next's `notFound()`).

## 6. Player profile page

- [x] 6.1 Add `app/players/[id]/page.tsx` as a Server Component calling `getPlayer(id)`, `listGames()`, and `listSeasons()`.
- [x] 6.2 Render the player's shirt number, name, and position(s).
- [x] 6.3 Filter `listGames()` to games where `team.roster` contains this player's id, group by `seasonId`, and render one section per season from `listSeasons()`, ordered ascending, each showing a games-played count and rendering even when empty; list each game's date and opponent within its section. (Reuses the `GamesTable` component built for `/games`, which also shows the derived score — not a player stat, so it doesn't conflict with the "no goal/penalty/award stats" non-goal.)
- [x] 6.4 Handle a missing/unknown player id (e.g. Next's `notFound()`).

## 7. Roster-list row navigation

- [x] 7.1 In `app/players/page.tsx`, make each roster row a whole-row link to `/players/[id]`, keeping the existing edit ✎ icon's link to `/players/[id]/edit` working independently. (Implemented with the same "stretched link" pattern as the games list: an absolutely-positioned `Link` fills the `position: relative` `<tr>`, and the edit icon's `Link` gets `relative z-10` so it stacks above the stretched link and stays independently clickable — no `stopPropagation`/client-component needed.)

## 8. Spec sync

- [x] 8.1 Verify `openspec/specs/portal-shell/spec.md`'s "Placeholder area pages" requirement, once synced, no longer lists `/games` as a placeholder. (Synced via `/opsx:sync` — confirmed.)
- [x] 8.2 Verify `openspec/specs/roster-list/spec.md`'s requirement, once synced, reflects whole-row navigation to the player profile alongside the unchanged edit icon. (Synced via `/opsx:sync` — confirmed.)

## 9. Tests

- [x] 9.1 Add a Playwright E2E spec (`e2e/create-game.spec.ts`) covering: valid game creation lands on `/games/[id]` with the correct details; the game type picker does not offer `NIHC`; the roster picker does not offer inactive players; the created game appears in the correct season section on `/games` with an incremented count and a 0-0 score; each rostered player's `/players/[id]` shows the game in the correct season section with an incremented count. ("A player cannot be added to the roster twice" is not a separately-testable UI interaction — the roster picker is one checkbox per player, so there is no UI path to attempt a duplicate; the schema-level rejection is already covered by `lib/schemas/game.test.ts`.)
- [x] 9.2 Add an E2E spec (`e2e/player-profile.spec.ts`) asserting whole-row click on `/players` navigates to `/players/[id]`, and that the edit icon still navigates to `/players/[id]/edit` unaffected. (Also required anchoring the pre-existing `/Edit/` regex in `edit-player.spec.ts` to `/^Edit /`, since a player named "Editable Player" made the new row-link's "View Editable Player" aria-label ambiguously match the old unanchored pattern.)
- [x] 9.3 Run `npm run test:unit`, `npm run test:integration` (requires local Docker stack per KAN-9), and `npm run test:e2e`; fix any failures. (Found and fixed a real bug in the process: `/games` and `/games/new` have no dynamic route segment and read live collections with no `fetch()`/dynamic-API call, so Next 16 was statically prerendering them at build time and freezing the roster/season pickers and games list to whatever the database held at that moment. Fixed with `export const dynamic = "force-dynamic"` on both.)
- [x] 9.4 Run `npm run typecheck` and `npm run lint`.
