## Why

KAN-20 requires recording a game's goals (scorer, up to two assists, time, type) and having every related stat — the scorer's goals/points, each assister's assists/points, and team totals — update itself automatically. Today a game is created with empty `goals`/`penalties` arrays and there is no way to add, edit, or delete a goal anywhere in the app, and no player- or team-level stats are derived or displayed at all (the player profile explicitly excludes them, a scope cut made in KAN-19/KAN-17). This change adds goal recording and reverses that exclusion so the derived numbers are visible where an admin can check them.

## What Changes

- Add a goal to a game's roster-scored goals: scorer + up to two assists (from roster, distinct from scorer and each other, second assist requires a first), minute, second (0–59), and type — reusing the existing `GoalCreateInputSchema`/`checkGameRefs` validation in `lib/schemas/game.ts`, which already enforces every rule in the acceptance criteria.
- Edit an existing goal (including changing the scorer) and delete a goal, via new `editGoal`/`deleteGoal` repository functions following the same load/merge/validate/replace pattern as `addGoal`/`updateGame`.
- A goals section on `/games/[id]` listing recorded goals with add/edit/delete actions — this page currently has no goals UI at all.
- A new derived-stats engine, following the existing `deriveScore` pattern (pure functions over `Game` documents, nothing stored): per-player season stats (goals, assists, points, PIMs, Man of the Match / Warrior of the Game counts) and per-team season totals, per the formulas already specified in `docs/03-data-model.md`'s "Derived stats" section.
- **BREAKING (spec-level):** reverse the player-profile requirement that excludes goal/penalty/award stats. The player profile now shows, per season section, goals/assists/points/PIMs/award counts as plain text alongside the existing games-played count.
- Because changing a goal's scorer only ever recomputes from the edited `Game` document (stats are never stored), "moving" a stat between two players falls out of the derivation for free — no special-case update logic needed.

Out of scope for this change (values will correctly show as empty/zero until these exist): recording penalties, and recording netminder/Man of the Match/Warrior of the Game — no UI exists for any of these yet, only the already-agreed schema/repository support to set them.

## Capabilities

### New Capabilities
- `stats-engine`: pure derivation of per-player season stats (games played, goals, assists, points, PIMs, MOTM/WOTG counts) and per-team season totals, computed from `Game` documents per `docs/03-data-model.md`'s "Derived stats" section. No new stored fields.

### Modified Capabilities
- `game-management`: add requirements for recording, editing, and deleting a goal on an existing game (scorer, ≤2 assists, minute/second, type), including the `/games/[id]` goals section and its add/edit/delete actions.
- `player-profile`: reverse "Player profile excludes goal, penalty, and award stats" — the profile now shows goals, assists, points, PIMs, and MOTM/WOTG counts per season, as plain text.

## Impact

- `lib/repositories/games.ts` — new `editGoal`, `deleteGoal` functions.
- `lib/derived/` — new stats module(s) alongside the existing `score.ts`.
- `app/games/[id]/page.tsx` — new goals section (list + links to add/edit/delete).
- `app/games/actions.ts` (and a new goal form component, following `GameForm.tsx`/`RosterForm.tsx`) — server actions for goal add/edit/delete.
- `app/players/[id]/page.tsx` — render the five per-season derived stats.
- `openspec/specs/game-management/spec.md`, `openspec/specs/player-profile/spec.md` — requirement changes.
- No schema changes: `lib/schemas/game.ts`'s `GoalSchema`/`GoalCreateInputSchema` and `checkGameRefs` already implement every validation rule this change needs.
