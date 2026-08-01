## 1. Opponent goal CRUD in the repository layer

- [x] 1.1 Add `editOpponentGoal(gameId, opponentGoalId, patch)` to `lib/repositories/games.ts` following the `editGoal` load-merge-validate-replace pattern, operating on `opponentTeam.goals` and re-validating via `GameSchema.parse`.
- [x] 1.2 Add `deleteOpponentGoal(gameId, opponentGoalId)` to `lib/repositories/games.ts`, removing the goal from `opponentTeam.goals` and re-validating/replacing.
- [x] 1.3 Both throw `NotFoundError` when the game doesn't exist or the opponent goal id isn't found within it.
- [x] 1.4 Integration tests in `tests/integration/repositories/games.test.ts` for `editOpponentGoal` (including rejecting an edit that fails `OpponentGoalCreateInputSchema`) and `deleteOpponentGoal` (including deleting a not-found opponent goal id). 32/32 passing.

## 2. Opponent goal form and server actions

- [x] 2.1 Add `parseOpponentGoalFormData` to `app/games/form-parsing.ts`, validating against `OpponentGoalCreateInputSchema`, following `parseGoalFormData`'s structure.
- [x] 2.2 Add server actions in `app/games/actions.ts` for recording, editing, and deleting an opponent goal, matching `addGoalAction`/`updateGoalAction`/`deleteGoalAction`.
- [x] 2.3 Add an `OpponentGoalForm` component: scorer name `<input>` (free text, no roster prop), minute, second, type (using `GOAL_TYPE_LABELS`) — following `GoalForm.tsx`'s structure minus the assist fields.
- [x] 2.4 Add `/games/[id]/opponent-goals/new/page.tsx` rendering `OpponentGoalForm` in create mode, redirecting to `/games/[id]` on success.
- [x] 2.5 Add `/games/[id]/opponent-goals/[opponentGoalId]/edit/page.tsx` rendering `OpponentGoalForm` pre-filled, redirecting to `/games/[id]` on success; 404s if the opponent goal id doesn't exist on the game.
- [x] 2.6 Page tests for both routes (unknown game id 404s; on the edit route, unknown opponent goal id 404s too), matching the existing 404-only `page.test.ts` pattern used for the goal routes.

## 3. Opponent penalty CRUD in the repository layer

- [x] 3.1 Add `editOpponentPenalty(gameId, opponentPenaltyId, patch)` to `lib/repositories/games.ts` following the `editPenalty` load-merge-validate-replace pattern, operating on `opponentTeam.penalties`.
- [x] 3.2 Add `deleteOpponentPenalty(gameId, opponentPenaltyId)` to `lib/repositories/games.ts`, removing the penalty from `opponentTeam.penalties` and re-validating/replacing.
- [x] 3.3 Both throw `NotFoundError` when the game doesn't exist or the opponent penalty id isn't found within it.
- [x] 3.4 Integration tests in `tests/integration/repositories/games.test.ts` for `editOpponentPenalty` (including rejecting a non-positive duration or empty offender name) and `deleteOpponentPenalty` (including deleting a not-found opponent penalty id). 32/32 passing.

## 4. Opponent penalty form and server actions

- [x] 4.1 Add `parseOpponentPenaltyFormData` to `app/games/form-parsing.ts`, validating against `OpponentPenaltyCreateInputSchema`, following `parsePenaltyFormData`'s structure.
- [x] 4.2 Add server actions in `app/games/actions.ts` for recording, editing, and deleting an opponent penalty, matching `addPenaltyAction`/`updatePenaltyAction`/`deletePenaltyAction`.
- [x] 4.3 Add an `OpponentPenaltyForm` component: offender name `<input>` (free text, no roster prop, no "Bench" option), minute, second, type (using `PENALTY_CODE_LABELS`), duration — following `PenaltyForm.tsx`'s structure.
- [x] 4.4 Add `/games/[id]/opponent-penalties/new/page.tsx` rendering `OpponentPenaltyForm` in create mode, redirecting to `/games/[id]` on success.
- [x] 4.5 Add `/games/[id]/opponent-penalties/[opponentPenaltyId]/edit/page.tsx` rendering `OpponentPenaltyForm` pre-filled, redirecting to `/games/[id]` on success; 404s if the opponent penalty id doesn't exist on the game.
- [x] 4.6 Page tests for both routes (unknown game id 404s; on the edit route, unknown opponent penalty id 404s too), matching the existing 404-only `page.test.ts` pattern. 33/33 unit tests passing, typecheck clean.

## 5. Game detail page — opponent goals and penalties lists

- [x] 5.1 Add an "Opponent goals" section to `app/games/[id]/page.tsx`, same shape as the Goals section (heading + count, "Record" link, list with scorer name/time/type, edit/delete links per item, empty state) — reads `game.opponentTeam.goals`, no `players` lookup needed since the scorer name is already a display string.
- [x] 5.2 Add an "Opponent penalties" section, same shape as the Penalties section — reads `game.opponentTeam.penalties`.
- [x] 5.3 Wire delete actions via `deleteOpponentGoalAction`/`deleteOpponentPenaltyAction` bound to no-field `<form>`s per row, same pattern as the team-side delete actions. Link/button text distinguishes "Edit opponent goal"/"Delete opponent goal" and "Edit opponent penalty"/"Delete opponent penalty" from the existing team-side labels.
- [x] 5.4 Confirmed no code change needed — `deriveScore(game.team.goals, game.opponentTeam.goals)` already reads the same `opponentTeam.goals` array the new actions append to.
- [x] 5.5 `app/games/[id]/page.test.ts` unchanged, still passes (404-path only, verified alongside the rest of the app/games unit suite: 33/33 passing).

## 6. End-to-end coverage

- [x] 6.1 Add `e2e/record-and-edit-opponent-goals-and-penalties.spec.ts` covering: recording an opponent goal, editing it, deleting it, recording an opponent penalty, editing it, deleting it. 2/2 passing.
- [x] 6.2 Assert the derived score on `/games/[id]` (and on the `/games` list row) reflects a recorded opponent goal.
- [x] 6.3 Assert recording an opponent goal and an opponent penalty changes no rostered player's derived goals/assists/points/PIMs on their profile — used Jamie Ashworth (confirmed via grep: only referenced by roster-membership specs, never by a goal/penalty-recording spec, so her stats are never mutated by anything but this spec) with the same before/after delta pattern as the team goals/penalties specs. Re-ran `record-and-edit-goals.spec.ts` and `record-and-edit-penalties.spec.ts` alongside — no regressions (7/7 passing).

## 7. Spec sync

- [x] 7.1 Run `openspec validate` against the change before archiving. Change is valid. Full suite green: 149/149 unit, 50/50 integration, 9/9 e2e (goals/penalties/opponent specs), `tsc --noEmit` clean.
- [x] 7.2 Archived this change and synced `game-management` into `openspec/specs/`.
