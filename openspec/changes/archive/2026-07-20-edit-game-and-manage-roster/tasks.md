## 1. Repository layer

- [x] 1.1 Add `RosterPlayerReferencedError` to `lib/repositories/internal/errors.ts`, carrying a `blocked: BlockedRosterPlayer[]` array (`playerId`, `goalCount`, `assistCount`, `penaltyCount`, `isNetminder`, `isManOfTheMatch`, `isWarriorOfTheGame`).
- [x] 1.2 Add `updateGameRoster(gameId, requestedRoster)` to `lib/repositories/games.ts`: compute `removed = existingRoster − requestedRoster`, scan goals/penalties/award fields for each removed player to build `blocked`, compute `appliedRoster = requestedRoster ∪ blocked`, validate with `GameSchema` and write it, then throw `RosterPlayerReferencedError(blocked)` if `blocked` is non-empty (after the write).
- [x] 1.3 Confirm `updateGame` (existing) needs no changes to support the details-only edit (date/seasonId/type/location/opponentName) — verify it does not accept or touch `roster` from this new form's action.
- [x] 1.4 Add unit/integration test coverage for `updateGameRoster`: safe removal, blocked removal leaves player on roster and throws with correct counts, mixed safe+blocked removal in one call applies the safe one and blocks only the other, addition-only call.

## 2. Game details edit form

- [x] 2.1 Generalize `app/games/GameForm.tsx` to support create and edit modes (initial values, submit label), following the `PlayerForm` precedent.
- [x] 2.2 Add `updateGameAction` to `app/games/actions.ts`, validating against the same schema subset as create and calling `updateGame`.
- [x] 2.3 Add `app/games/[id]/edit/page.tsx`: loads the game via `getGame`, 404s if missing, renders `GameForm` in edit mode.
- [x] 2.4 Verify field-level and form-level errors render via the existing `FieldErrors` pattern, matching create-form behavior.

## 3. Roster management form

- [x] 3.1 Create `app/games/RosterForm.tsx`: player picker offering (currently-rostered ∪ active) players, checkboxes for roster membership.
- [x] 3.2 Add `updateGameRosterAction` to `app/games/actions.ts`: parses the submitted roster, calls `updateGameRoster`, and on `RosterPlayerReferencedError` composes the human-readable per-player message (naming goal/assist/penalty counts and the specific award/netminder role) using the already-loaded player list, returning form state without redirecting.
- [x] 3.3 On full success (no blocked players), redirect to `/games/[id]`, matching other actions' behavior.
- [x] 3.4 Add `app/games/[id]/roster/page.tsx`: loads the game and the (rostered ∪ active) player pool, renders `RosterForm`.

## 4. Game detail page entry points

- [x] 4.1 Add "Edit details" link to `/games/[id]/edit` and "Manage roster" link to `/games/[id]/roster` on `app/games/[id]/page.tsx`.

## 5. E2E coverage

- [x] 5.1 Add a journey editing a game's details (date/opponent/type/location) and verifying the change on `/games/[id]`.
- [x] 5.2 Add a journey adding a player to an existing game's roster and verifying they appear on `/games/[id]` and on their `/players/[id]` games-played list.
- [x] 5.3 Add a journey removing an unreferenced player from a game's roster and verifying the removal on both `/games/[id]` and the affected player's `/players/[id]`.
- [x] 5.4 Add the blocked-removal journey using existing seed data (a seeded game with a goal/penalty/award referencing a seeded player): attempt to remove that player alongside an unreferenced one, verify the unreferenced player is removed, the referenced player remains, and the blocked-reason message is visible.

## 6. Spec sync

- [x] 6.1 After implementation, run the sync-specs workflow to merge `specs/game-management/spec.md`'s new requirements into `openspec/specs/game-management/spec.md`.
