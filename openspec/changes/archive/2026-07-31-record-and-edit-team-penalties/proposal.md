## Why

KAN-21 requires recording a game's penalties (offender, minute/second, type, duration) — including bench penalties — with penalty minutes updating automatically, and having that reflected when a penalty is edited or deleted. Today a game is created with an empty `penalties` array and `addPenalty` exists at the repository layer, but there is no way to edit or delete a penalty, and no UI anywhere records one. Unlike KAN-20 ("Record and edit team goals"), the stats side of this ticket is already done: `derivePlayerSeasonStats`/`deriveTeamSeasonStats` already compute PIMs correctly (bench-excluded per player, bench-included for the team), and the player profile already renders a PIMs figure per season — it has simply been sitting at zero because nothing could create a penalty. This change is almost entirely the UI/action layer that was deliberately left for this ticket.

## What Changes

- Add a penalty to a game's team-scored penalties: offender (a rostered player, or the literal `BENCH`), minute, second (0–59), penalty type, and duration in minutes — reusing the existing `PenaltyCreateInputSchema`/`checkGameRefs` validation in `lib/schemas/game.ts` unchanged, including its deliberate lack of a minute upper bound (unlike goals, penalties were never given a game-length ceiling in `docs/03-data-model.md`).
- Edit an existing penalty (including reassigning the offender, or moving it to/from `BENCH`) and delete a penalty, via new `editPenalty`/`deletePenalty` repository functions following the same load/merge/validate/replace pattern as `editGoal`/`deleteGoal`.
- A penalties section on `/games/[id]` listing recorded penalties with add/edit/delete actions, showing "Bench" for bench penalties rather than a player name — this page currently has no penalties UI at all.
- The offender picker in the new penalty form offers every rostered player plus a `Bench` option — the one form control shape not already covered by KAN-20's `GoalForm` (whose scorer/assist pickers never allow a non-player selection).
- The penalty type picker uses the existing `PENALTY_CODE_LABELS` friendly labels (e.g. `TRIP` → "Tripping") — already fully implemented, satisfying the "friendly labels, not raw codes" acceptance criterion with no new code.

Out of scope for this change: opponent penalties (`opponentTeam.penalties`, already served by the untouched `addOpponentPenalty`), and any team-level stats display page — `deriveTeamSeasonStats` remains unit-tested-only, per the same non-goal KAN-20 established (see design.md).

## Capabilities

### New Capabilities
_None._ No new capability is introduced by this change.

### Modified Capabilities
- `game-management`: add requirements for recording, editing, and deleting a penalty on an existing game (offender from roster or `BENCH`, minute/second, type, duration), including the `/games/[id]` penalties section and its add/edit/delete actions.

Note: `stats-engine` and `player-profile` are **not** modified by this change. Both capabilities already fully cover PIMs derivation and display as of KAN-20 — `derivePlayerSeasonStats`/`deriveTeamSeasonStats` already compute PIMs correctly, and the player profile already renders a per-season PIMs figure. This change only supplies the missing input (a way to actually record a penalty); no requirement in either spec needs to change for that number to start being non-zero.

## Impact

- `lib/repositories/games.ts` — new `editPenalty`, `deletePenalty` functions.
- `app/games/[id]/page.tsx` — new penalties section (list + links to add/edit/delete), alongside the existing goals section.
- `app/games/actions.ts` (and a new `PenaltyForm` component, following `GoalForm.tsx`'s structure) — server actions for penalty add/edit/delete.
- `openspec/specs/game-management/spec.md` — requirement changes (additive only).
- No schema changes: `lib/schemas/game.ts`'s `PenaltySchema`/`PenaltyCreateInputSchema` and `checkGameRefs` already implement every validation rule this change needs.
- No changes to `lib/derived/player-stats.ts`, `lib/derived/team-stats.ts`, or `app/players/[id]/page.tsx` — all already correct from KAN-20.
