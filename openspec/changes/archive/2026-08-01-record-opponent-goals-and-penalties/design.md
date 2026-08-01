## Context

`Game.opponentTeam.{goals,penalties}` and their validation (`OpponentGoalSchema`/`OpponentGoalCreateInputSchema`, `OpponentPenaltySchema`/`OpponentPenaltyCreateInputSchema`) already exist in `lib/schemas/game.ts` and already enforce every rule this ticket needs: `scoredBy`/`offender` as non-empty free text (no roster check — `checkGameRefs` only validates the `team.*` side), time bounds, non-positive duration rejection. `lib/repositories/games.ts` has `addOpponentGoal`/`addOpponentPenalty` but no edit/delete — the same gap `editGoal`/`deleteGoal` and `editPenalty`/`deletePenalty` already filled twice over (KAN-20, KAN-21).

`lib/derived/score.ts`'s `deriveScore(teamGoals, opponentGoals)` already reads `game.opponentTeam.goals` and is already called from `app/games/[id]/page.tsx`. `lib/derived/player-stats.ts` and `lib/derived/team-stats.ts` only ever iterate `game.team.goals`/`game.team.penalties` — `opponentTeam` doesn't appear in either file. Both AC4 (score) and AC3 (no Warriors stat changes) are therefore already true of the data model; this ticket's job is to give the admin a way to actually populate `opponentTeam.goals`/`opponentTeam.penalties`, and to add regression coverage proving both hold once that data exists.

`app/games/[id]/page.tsx` currently renders two parallel sections, Goals and Penalties, each following the same shape (heading + count, "Record" link, list with per-item edit/delete via a bound server action, empty state). `GoalForm`/`PenaltyForm` are simple `useActionState` forms with a `FieldErrors` helper.

## Goals / Non-Goals

**Goals:**
- Add, edit, and delete an opponent goal and an opponent penalty on an existing game, reusing the existing schema validation unchanged.
- A scorer/offender field that's a free-text `<input>`, not a roster `<select>` — opponent players aren't rostered entities, so there's no picker to build, no "Bench" equivalent, and no `rosterPlayers` prop needed on either form.
- Verify end-to-end that recording an opponent goal changes the derived score and that recording opponent goals/penalties changes no Warriors player's or the team's derived stats.

**Non-Goals:**
- Any schema change — `OpponentGoalSchema`/`OpponentPenaltySchema` and their create-input variants are complete as-is.
- Any change to `deriveScore`, `derivePlayerSeasonStats`, or `deriveTeamSeasonStats` — all three already have the correct behavior for opponent events; this ticket adds coverage, not logic.
- Free-text name normalization (trimming, casing, dedup against previously-entered opponent names) — the existing `opponentTeam.name` field on the game itself has never done this (`formData.get("opponentName")` passes straight through to `z.string().min(1)`), so `scoredBy`/`offender` follow the same precedent for consistency. Revisit only if it becomes an actual data-quality problem.

## Decisions

**Opponent routes mirror the goal/penalty routes exactly.** `/games/[id]/opponent-goals/new`, `/games/[id]/opponent-goals/[opponentGoalId]/edit`, `/games/[id]/opponent-penalties/new`, `/games/[id]/opponent-penalties/[opponentPenaltyId]/edit` — same shape as the existing `/goals/...` and `/penalties/...` routes, each a dedicated form redirecting back to `/games/[id]`. Delete is an action from the respective list on `/games/[id]`, same as goal/penalty delete.

**`editOpponentGoal`/`deleteOpponentGoal`/`editOpponentPenalty`/`deleteOpponentPenalty` follow `editGoal`/`deleteGoal`/`editPenalty`/`deletePenalty` exactly:** load existing game, produce a merged `opponentTeam.goals`/`opponentTeam.penalties` array, `GameSchema.parse` the merged document, `replaceOne`. `NotFoundError` covers both an unknown game and an unknown opponent-goal/opponent-penalty id, same precedent as the team-side entities.

**`OpponentGoalForm`/`OpponentPenaltyForm` mirror `GoalForm`/`PenaltyForm`'s structure** (one field per schema field, same `FieldErrors`/`useActionState` pattern, same button/pending-state copy) with two differences: the scorer/offender field is a plain text `<input name="scoredBy">`/`<input name="offender">` instead of a `<select>`, and neither form takes a `rosterPlayers` prop — there's nothing to pick from. `OpponentGoalForm` has no assist fields (matches `OpponentGoalSchema`, which has none). `OpponentPenaltyForm` keeps the `duration` field, same as `PenaltyForm`.

**Game-detail page gets two more sections, same shape as Goals/Penalties**, rendered directly from `game.opponentTeam.goals`/`game.opponentTeam.penalties` — the scorer/offender name is shown as-is (it's already a display string, unlike the team side's `playerLabel`/`offenderLabel` lookups against `players`).

**No special-case logic anywhere for stat isolation.** `derivePlayerSeasonStats`/`deriveTeamSeasonStats` already never touch `opponentTeam` — this ticket adds no new derivation code, only the form/action path that lets an admin actually produce opponent goals/penalties, plus tests that assert the isolation holds.

## Risks / Trade-offs

- **Free-text scorer/offender names have no autocomplete or dedup against previously-entered opponent names for the same team** (e.g. "J. Smith" vs "James Smith" on two different goals) → accepted per the reconfirmed non-goal; nothing in the AC asks for normalization, and the schema/precedent already treats these as arbitrary strings.
- **No "opponent goal/penalty not found" distinct error type**, same precedent as goals/penalties — `NotFoundError` scoped by id covers it.

## Open Questions

- None blocking — this is a smaller, more mechanical change than KAN-20/KAN-21 since the schema and score derivation are already done; only the CRUD surface is missing.
