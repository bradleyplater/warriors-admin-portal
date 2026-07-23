## Context

`Game.team.goals` and its validation (`GoalSchema`/`GoalCreateInputSchema`, `checkGameRefs` in `lib/schemas/game.ts`) already exist and already enforce every rule in KAN-20's acceptance criteria (assist distinctness, second 0–59, minute bounds, roster membership). `lib/repositories/games.ts` has `addGoal` but no `editGoal`/`deleteGoal`. `app/games/[id]/page.tsx` has no goals UI. No player- or team-level stats are derived anywhere except team score (`lib/derived/score.ts`). `app/players/[id]/page.tsx` fetches all games via `listGames()` and filters in memory by roster membership and season (no repository-level filtering exists) — `docs/03-data-model.md` notes data volumes are tiny, so this pattern is intentional, not a gap.

The player-profile spec currently has a hard requirement excluding stats display, set during KAN-19 after KAN-17 deferred building it ([[kan-17-stats-deferred]] in project memory). This change reverses that.

## Goals / Non-Goals

**Goals:**
- Add, edit, and delete a goal on an existing game, reusing the existing schema validation unchanged.
- Derive per-player and per-team season stats (goals, assists, points, PIMs, MOTM/WOTG counts) as pure functions over already-loaded `Game[]`, mirroring `deriveScore`'s shape — nothing stored, nothing new in the repository beyond goal CRUD.
- Show those derived stats on the player profile, per season, as plain text.

**Non-Goals:**
- Recording penalties or setting netminder/Man of the Match/Warrior of the Game — no UI exists for these yet and none is added here. Their derived counts will read as zero/empty until a future ticket adds that UI; this is intentional (see project memory `kan-20-stats-scope`).
- Any new repository-level filtering (by player or season) — the existing fetch-all-then-filter-in-memory pattern is reused for the same reason it's already used on the player profile page.
- Team-level stats display anywhere in the UI — only the derivation function is added now (`stats-engine` capability); no page renders team totals as part of this change. (Deferred until a page needs it — avoids building a display surface with no consumer.)

## Decisions

**Goal routes mirror the existing game-details/roster split.** `/games/[id]/goals/new` and `/games/[id]/goals/[goalId]/edit`, each a dedicated form redirecting back to `/games/[id]` — same shape as `/games/[id]/edit` and `/games/[id]/roster`. Delete is an action from the goals list on `/games/[id]` (no separate page), consistent with there being no standalone delete page anywhere else in the app.

**`editGoal`/`deleteGoal` follow the `addGoal`/`updateGame` pattern exactly:** load existing game, produce a merged `team.goals` array, `GameSchema.parse` the merged document (so `checkGameRefs` re-validates roster membership and assist rules against the *edited* goal), `replaceOne`. No new error types needed — `NotFoundError` (game not found) already covers it; there's no "goal not found" case distinct from "game not found" since goals are addressed by index/id within the loaded document and a missing goal id is a not-found-game-shaped error in practice (edit/delete on a nonexistent goal id within an existing game is treated as `NotFoundError` too, scoped by goal id, to match the existing single error type rather than introducing a second one for one caller).

**Stats derivation is pure functions over `Game[]`, not a repository/DB concern.** Two functions, alongside `lib/derived/score.ts`:
- `derivePlayerSeasonStats(games: Game[], playerId: string, seasonId: string)` → `{ gamesPlayed, goals, assists, points, pims, manOfTheMatch, warriorOfTheGame }`
- `deriveTeamSeasonStats(games: Game[], seasonId: string)` → `{ goals, assists, pims }`

Both take already-fetched games (the caller filters by season/player exactly as `app/players/[id]/page.tsx` already does), keeping the derivation testable in isolation with plain arrays of `Game` fixtures — no DB, no mocking, matching how `deriveScore` is unit-tested today.

**Bench PIMs count toward the team only**, per `docs/03-data-model.md`: `deriveTeamSeasonStats` sums all penalty durations including `offender: "BENCH"`; `derivePlayerSeasonStats` only sums penalties where `offender === playerId`.

**Changing a goal's scorer needs no special-case "move" logic.** Because stats are recomputed fresh from `Game.team.goals` on every read, editing `scoredBy` from player A to player B is just a normal field update — the next read of A's stats naturally excludes the goal and B's naturally includes it. This is the direct payoff of the "fully derived, never stored" architecture (D6 in `docs/03-data-model.md`) already committed to for score; KAN-20's "moves the stat... verified in E2E" acceptance criterion is satisfied by the E2E test reading the profile before and after the edit, not by any code path that explicitly transfers a value.

**Player profile stats render as plain text lines, not a new component system.** Added into the existing `SeasonSection` in `app/players/[id]/page.tsx`, next to the games-played count — no stat cards, no charts, matching the explicit "simple text" requirement.

## Risks / Trade-offs

- **Two derived-stats functions with overlapping logic to `deriveScore`** (both iterate goals by type/player) → acceptable duplication for now: `deriveScore` answers "what's the final score," the new functions answer "what did this player/team do." Different shapes, different callers; premature to unify into one mega-derivation module before a second consumer of team stats exists.
- **In-memory filtering over all games doesn't scale** → accepted per `docs/03-data-model.md`'s explicit note that data volumes are tiny and indexes exist for correctness, not scale. Matches the existing player-profile page's own approach.
- **No "goal not found" distinct error type** → if this proves confusing in practice (e.g. tests need to distinguish "game not found" from "goal not found" for a clearer message), a `NotFoundError` variant scoped to goals can be added later; not doing it preemptively since no caller has asked for the distinction yet.

## Open Questions

- None blocking — implementation can proceed directly from `docs/03-data-model.md`'s existing Derived stats formulas and the schema validation already in place.
