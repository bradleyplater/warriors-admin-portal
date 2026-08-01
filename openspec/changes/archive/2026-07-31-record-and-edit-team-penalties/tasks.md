## 1. Penalty CRUD in the repository layer

- [x] 1.1 Add `editPenalty(gameId, penaltyId, patch)` to `lib/repositories/games.ts` following the `editGoal` load-merge-validate-replace pattern; re-validates the full game via `GameSchema.parse` so `checkGameRefs` re-checks the offender is rostered or `BENCH`.
- [x] 1.2 Add `deletePenalty(gameId, penaltyId)` to `lib/repositories/games.ts`, removing the penalty from `team.penalties` and re-validating/replacing.
- [x] 1.3 Both throw `NotFoundError` when the game doesn't exist or the penalty id isn't found within it.
- [x] 1.4 Integration tests in `tests/integration/repositories/games.test.ts` for `editPenalty` (including reassigning offender between a player and `BENCH` in both directions, and rejecting an edit that violates roster/BENCH rules) and `deletePenalty` (including deleting a not-found penalty id). 21/21 passing.

## 2. Penalty form and server actions

- [x] 2.1 Add server actions in `app/games/actions.ts` for recording, editing, and deleting a penalty, validating against `PenaltyCreateInputSchema` before calling the repository, matching the goal action patterns (`addGoalAction`/`updateGoalAction`/`deleteGoalAction`).
- [x] 2.2 Add a `PenaltyForm` component: offender picker (roster players + a `Bench` option), minute, second, type (using `PENALTY_CODE_LABELS` for friendly labels), duration — following `GoalForm.tsx`'s structure.
- [x] 2.3 Add `/games/[id]/penalties/new/page.tsx` rendering `PenaltyForm` in create mode, redirecting to `/games/[id]` on success.
- [x] 2.4 Add `/games/[id]/penalties/[penaltyId]/edit/page.tsx` rendering `PenaltyForm` pre-filled, redirecting to `/games/[id]` on success; 404s if the penalty id doesn't exist on the game.
- [x] 2.5 Page tests for both routes (unknown game id 404s; on the edit route, unknown penalty id 404s too) — matching the existing 404-only `page.test.ts` pattern used for the goal routes. 3/3 passing.

## 3. Game detail page — penalties list

- [x] 3.1 Add a penalties section to `app/games/[id]/page.tsx` listing each penalty's offender (player name, or "Bench" for `BENCH`), minute:second, friendly type label, and duration, with a link to record a new penalty and edit/delete links per penalty. (Also renamed the goals section's `formatGoalTime` to `formatMinuteSecond`, now shared by both sections.)
- [x] 3.2 Wire the delete action via `deletePenaltyAction` bound to a no-field `<form>` per penalty row, same pattern as `deleteGoalAction`. Link/button text is "Edit penalty"/"Delete penalty" (not bare "Edit"/"Delete") to avoid substring-match collisions with "Edit details" and the goals section's "Edit goal"/"Delete goal", same reasoning as KAN-20.
- [x] 3.3 `app/games/[id]/page.test.ts` unchanged (still passes, 404-path only) — penalties-list rendering and the Bench label are covered by the e2e spec in task 4, matching how the goals list was covered in KAN-20.

## 4. End-to-end coverage

- [x] 4.1 Add `e2e/record-and-edit-penalties.spec.ts` covering: recording a penalty for a rostered player, editing a penalty, deleting a penalty, and a bench penalty specifically — asserting it appears in the game's penalty list labeled "Bench" and that it does NOT change any individual player's PIMs on their profile (team PIMs are not asserted anywhere, per design.md's non-goal on a team-stats display). 4/4 passing.
- [x] 4.2 Reuse the before/after delta pattern from `e2e/record-and-edit-goals.spec.ts` (dedicated test players not referenced by other specs' exact-count assertions) rather than absolute totals, since every active player already carries seed-data PIMs in every season.

## 5. Spec sync

- [ ] 5.1 Run `openspec validate` against the change before archiving.
- [ ] 5.2 After merge, archive this change and sync `game-management` into `openspec/specs/`.
