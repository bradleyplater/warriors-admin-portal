## Context

`Game.team.penalties` and its validation (`PenaltySchema`/`PenaltyCreateInputSchema`, `checkGameRefs` in `lib/schemas/game.ts`) already exist and already enforce every rule KAN-21 needs (offender roster-or-`BENCH`, duration > 0, second 0–59). `lib/repositories/games.ts` has `addPenalty` but no `editPenalty`/`deletePenalty` — the exact gap `editGoal`/`deleteGoal` filled for goals in KAN-20. `app/games/[id]/page.tsx` has a goals section (from KAN-20) but no penalties section. `PENALTY_CODE_LABELS` (`lib/schemas/enums.ts`) already has friendly labels for all 29 codes.

Critically, unlike goals, the stats side is already finished: `derivePlayerSeasonStats` already sums a player's own penalty durations into `pims` while explicitly excluding `offender: "BENCH"`; `deriveTeamSeasonStats` already includes bench PIMs in the team total. Both were built during KAN-20 as part of front-loading all five stat fields ([[kan-20-stats-scope]] in project memory), and the player profile already renders `stat-pims` per season. This ticket supplies the missing input — a way to actually create a penalty — not new derivation logic.

## Goals / Non-Goals

**Goals:**
- Add, edit, and delete a penalty on an existing game, reusing the existing schema validation unchanged.
- An offender picker that offers rostered players plus a `Bench` option — the one control shape KAN-20's `GoalForm` didn't need.
- Verify end-to-end that a bench penalty behaves correctly: visible on the game's penalty list, invisible on any individual player's stats.

**Non-Goals:**
- Any team-stats display page. `deriveTeamSeasonStats` stays unit-tested-only ([[team-stats-display-deferred]] in project memory) — reconfirmed for this ticket even though bench PIMs conceptually "count toward the team." The E2E acceptance criterion is satisfied by the negative assertion (no individual player's PIMs change) plus the penalty's visible presence in the game's own list, not by a team total appearing anywhere.
- Opponent penalties (`opponentTeam.penalties`) — already served by `addOpponentPenalty`, untouched here, matching KAN-20's precedent of leaving opponent goals out of scope.
- Any change to `stats-engine` or `player-profile` specs — both already fully cover PIMs.

## Decisions

**Penalty routes mirror the goal routes exactly.** `/games/[id]/penalties/new` and `/games/[id]/penalties/[penaltyId]/edit`, each a dedicated form redirecting back to `/games/[id]` — same shape as `/games/[id]/goals/new` and `/games/[id]/goals/[goalId]/edit`. Delete is an action from the penalties list on `/games/[id]`, same as goal delete.

**`editPenalty`/`deletePenalty` follow `editGoal`/`deleteGoal` exactly:** load existing game, produce a merged `team.penalties` array, `GameSchema.parse` the merged document (re-validating `checkGameRefs`), `replaceOne`. `NotFoundError` covers both an unknown game and an unknown penalty id within an existing game, same precedent as goals.

**Offender picker is a `<select>` with roster players plus a literal `"BENCH"` option labeled "Bench".** `PenaltyForm` otherwise mirrors `GoalForm`'s structure (one field per schema field, same `FieldErrors`/`useActionState` pattern) but has no assist-equivalent fields and adds a `duration` input.

**Penalty type picker uses `PENALTY_CODE_LABELS` directly**, same pattern as `GoalForm`'s use of `GOAL_TYPE_LABELS` — a flat `<select>` over all 29 codes; no grouping, since nothing in the acceptance criteria asks for it and a flat list is simplest.

**No special-case logic for bench penalties.** `derivePlayerSeasonStats`/`deriveTeamSeasonStats` already handle `BENCH` correctly (excluded per-player, included for team) — this ticket adds no new derivation code, only the form/action path that lets an admin actually produce a `BENCH` penalty.

## Risks / Trade-offs

- **E2E can't positively assert "team PIMs increased"** for the bench-penalty journey, since no page shows a team total → accepted per the reconfirmed non-goal; the test instead asserts the penalty's presence (labeled "Bench") on the game's own list and the absence of any change to individual players' PIMs, which is the observable, testable surface of "counts toward the team only."
- **No "penalty not found" distinct error type**, same precedent as goals — `NotFoundError` scoped by penalty id covers it; revisit only if a caller actually needs the distinction.

## Open Questions

- None blocking — this is a smaller, more mechanical change than KAN-20 since the stats engine and its display are already done.
