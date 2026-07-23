## 1. Stats derivation (stats-engine)

- [x] 1.1 Add `lib/derived/player-stats.ts` with `derivePlayerSeasonStats(games, playerId, seasonId)` returning `{ goals, assists, points, pims, manOfTheMatch, warriorOfTheGame }`, per `docs/03-data-model.md`'s Derived stats section (bench penalties excluded from any individual player).
- [x] 1.2 Add `lib/derived/team-stats.ts` with `deriveTeamSeasonStats(games, seasonId)` returning `{ goals, assists, pims }`, including bench PIMs.
- [x] 1.3 Unit tests for both functions (`player-stats.test.ts`, `team-stats.test.ts`) covering: sums across multiple games, points = goals + assists, bench PIMs counted for team only, a season with no recorded goals/penalties/awards for a player yields zero, and a goal's `scoredBy` change moving the stat between two players' derived output when recomputed.

## 2. Goal CRUD in the repository layer

- [x] 2.1 Add `editGoal(gameId, goalId, patch)` to `lib/repositories/games.ts` following the `addGoal`/`updateGame` load-merge-validate-replace pattern; re-validates the full game via `GameSchema.parse` so `checkGameRefs` re-checks roster membership and assist rules against the edited goal.
- [x] 2.2 Add `deleteGoal(gameId, goalId)` to `lib/repositories/games.ts`, removing the goal from `team.goals` and re-validating/replacing.
- [x] 2.3 Both throw `NotFoundError` when the game doesn't exist or the goal id isn't found within it.
- [x] 2.4 Integration tests in `tests/integration/repositories/games.test.ts` for `editGoal` (including changing `scoredBy` to a different rostered player, and rejecting an edit that violates assist/roster rules) and `deleteGoal` (including deleting a not-found goal id).

## 3. Goal forms and server actions

- [x] 3.1 Add server actions in `app/games/actions.ts` for recording, editing, and deleting a goal, validating against `GoalCreateInputSchema` before calling the repository, matching the existing action patterns (e.g. `updateGameAction`).
- [x] 3.2 Add a `GoalForm` component (roster-scoped scorer/assist pickers, minute, second, type) reused by both the new-goal and edit-goal pages, following `GameForm.tsx`/`RosterForm.tsx`'s existing structure.
- [x] 3.3 Add `/games/[id]/goals/new/page.tsx` rendering `GoalForm` in create mode, redirecting to `/games/[id]` on success.
- [x] 3.4 Add `/games/[id]/goals/[goalId]/edit/page.tsx` rendering `GoalForm` pre-filled, redirecting to `/games/[id]` on success; 404s if the goal id doesn't exist on the game.
- [x] 3.5 Page tests for both routes (unknown game id and, on the edit route, unknown goal id, both 404 — matching the existing `page.test.ts` pattern, which tests the data-fetch/404 path only; form submission behavior for this codebase is verified by e2e tests, not page-level unit tests, matching how `updateGameAction`/`updateGameRosterAction` are tested today).

## 4. Game detail page — goals list

- [x] 4.1 Add a goals section to `app/games/[id]/page.tsx` listing each goal's scorer, assists, minute:second, and type, with a link to record a new goal and edit/delete links per goal.
- [x] 4.2 Wire the delete action via `deleteGoalAction` bound to a no-field `<form>` per goal row (no confirmation dialog exists anywhere else in this app for a destructive action — roster removal is a normal form resubmit, not a confirm prompt — so this matches that precedent rather than introducing a new pattern) and redirect back to `/games/[id]`.
- [x] 4.3 `app/games/[id]/page.test.ts` unchanged (still passes) — this codebase doesn't unit-test rendered JSX content on page components (no React Testing Library dependency; existing page tests cover only the 404/data-fetch path, e.g. roster rendering on this same page was never content-tested either). Goals-list rendering and the empty state are covered by the e2e spec in task 6.1 instead.

## 5. Player profile — derived stats display

- [x] 5.1 In `app/players/[id]/page.tsx`'s `SeasonSection`, compute `derivePlayerSeasonStats` per season (games already fetched and filtered per-player/per-season by the existing code) and render goals/assists/points/PIMs/MOTM/WOTG as plain text next to the games-played count.
- [x] 5.2 `app/players/[id]/page.test.ts` unchanged (still passes, 404-path only — this codebase never had a prior assertion that stats were absent at the page-test level, so there's nothing to invert here). Added `lib/derived/team-stats.seed-verify.test.ts` instead: an independent sanity check of the derivation formulas against the "Actual computed totals from the seeded games" comment already documented in `seed/data/team.ts` (SSN2223/2324/2425/2526 goals/assists/PIMs) — all 4 seasons match exactly. Per-season stats rendering itself is covered by the e2e spec in task 6.1.

## 6. End-to-end coverage

- [x] 6.1 Add `e2e/record-and-edit-goals.spec.ts` covering: recording a goal, editing a goal, deleting a goal, and specifically changing a goal's scorer and verifying the stat moves from the original scorer's profile to the new scorer's profile (KAN-20's explicit E2E acceptance criterion). Uses Dean Crosbie/Ollie Dunmore (unused by any other spec's exact-count assertions) and before/after deltas rather than absolute totals, since every active player already carries seed-data stats in every season. Full suite (35 tests) passes with no regressions.
- [x] 6.2 No page surfaces team totals (per design.md's non-goal), so team-stats derivation is covered at the unit level only — `lib/derived/team-stats.test.ts` plus `lib/derived/team-stats.seed-verify.test.ts`, which cross-checks `deriveTeamSeasonStats` against the independently-documented "Actual computed totals" comment in `seed/data/team.ts` for all 4 seeded seasons.

## 7. Spec sync

- [x] 7.1 `openspec validate record-and-edit-team-goals --json` passes clean (0 issues).
- [x] 7.2 Archived via `openspec archive record-and-edit-team-goals --yes`; `game-management` and `player-profile` specs updated, new `stats-engine` spec added to `openspec/specs/`. `openspec validate --all` passes (13/13 specs valid).
