## Why

The game record is currently one-sided: admins can capture the Warriors' own goals and penalties, but not the opposition's. Without opponent events, the derived score is wrong for any game the opponent scored in, and the game record can't stand as a complete account of the game. The schema layer (`OpponentGoalSchema`, `OpponentPenaltySchema`, `game.opponentTeam.{goals,penalties}`) and score derivation already anticipate this; only the CRUD surface (repository methods, forms, actions, pages) is missing.

## What Changes

- Add `editOpponentGoal` / `deleteOpponentGoal` and `editOpponentPenalty` / `deleteOpponentPenalty` to the games repository, mirroring the existing `editGoal`/`deleteGoal`/`editPenalty`/`deletePenalty` implementations. (`addOpponentGoal`/`addOpponentPenalty` already exist.)
- Add `OpponentGoalForm` and `OpponentPenaltyForm` components, mirroring `GoalForm`/`PenaltyForm`, but with a free-text scorer/offender `<input>` instead of a roster `<select>` (no "Bench" option, no roster prop).
- Add add/update/delete server actions and form-parsing functions for opponent goals and opponent penalties, mirroring the existing goal/penalty actions and `parseGoalFormData`/`parsePenaltyFormData`.
- Add routes: `/games/[id]/opponent-goals/new`, `/games/[id]/opponent-goals/[opponentGoalId]/edit`, `/games/[id]/opponent-penalties/new`, `/games/[id]/opponent-penalties/[opponentPenaltyId]/edit`.
- Add "Opponent goals" and "Opponent penalties" sections to `/games/[id]`, following the same shape as the existing "Goals" and "Penalties" sections (heading + count, "Record" link, list with per-item edit/delete, empty state).
- No changes to `deriveScore`, `derivePlayerSeasonStats`, or `deriveTeamSeasonStats` — the score already accounts for `opponentTeam.goals`, and stat derivation already reads only `team.*`, never `opponentTeam.*`. This change adds regression coverage confirming both, but does not modify that logic.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `game-management`: adds requirements for recording, editing, deleting, and listing opponent goals and opponent penalties on a game, and for opponent goals counting toward the game's derived score.

## Impact

- **Code**: `lib/repositories/games.ts`, `app/games/form-parsing.ts`, `app/games/actions.ts`, new `app/games/OpponentGoalForm.tsx` and `app/games/OpponentPenaltyForm.tsx`, new route files under `app/games/[id]/opponent-goals/` and `app/games/[id]/opponent-penalties/`, `app/games/[id]/page.tsx`.
- **Tests**: `tests/integration/repositories/games.test.ts` (opponent goal/penalty CRUD + stat-isolation regression), `app/games/form-parsing.test.ts`, a new e2e spec under `e2e/`.
- **No schema changes**: `lib/schemas/game.ts` already defines everything needed (`OpponentGoalSchema`, `OpponentPenaltySchema`, create-input variants, free-text validation).
- **No stats/derivation changes**: `lib/derived/score.ts`, `lib/derived/player-stats.ts`, `lib/derived/team-stats.ts` are unchanged.
