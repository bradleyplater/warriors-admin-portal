## 1. Derivation logic

- [x] 1.1 In `lib/derived/player-stats.ts`, add `gamesPlayed: number` to the `PlayerSeasonStats` interface.
- [x] 1.2 Compute `gamesPlayed` in `derivePlayerSeasonStats` as the count of `seasonGames` where `game.team.roster.some(r => r.playerId === playerId)`, so the function no longer depends on the caller having pre-filtered to the player's games.
- [x] 1.3 Extend `lib/derived/player-stats.test.ts` with cases: a game where the player is rostered but has no goals/assists/penalties/awards still counts toward `gamesPlayed`; a player never rostered in the season returns `gamesPlayed: 0` alongside zero for every other stat; `gamesPlayed` is unaffected by games outside the requested season (reuse the existing season-filter fixture).

## 2. Player profile page

- [x] 2.1 In `app/players/[id]/page.tsx`, call `derivePlayerSeasonStats(games, player._id, season._id)` with the full `games` list instead of the pre-filtered `playerGames`, and render `stats.gamesPlayed` in the season header instead of `games.length`. Keep `playerGames` as-is for the `GamesTable` list passed to each `SeasonSection` — that's a display concern, not a stats concern.

## 3. Seed-data oracle test

- [x] 3.1 Add `lib/derived/player-stats.seed-verify.test.ts`, following `team-stats.seed-verify.test.ts`'s pattern: import `games` from `seed/data/games.ts`, assert `derivePlayerSeasonStats` against hand-counted expected values documented in a comment (an independent oracle, not values copied from running the function).
- [x] 3.2 Cover, per the values hand-counted in `design.md`: `PLR100001` (Jamie Ashworth) across all four seeded seasons (goal-only, zero, goal-only, assist-only), `PLR100014` (Chris Norbury) across all four seasons (assist+award, goal-only, goal-only, assist-only — exercises both `manOfTheMatch` and `warriorOfTheGame`), and `PLR100005` (Sam Elliston, never rostered) returning all zeros including `gamesPlayed: 0` in every season.
- [x] 3.3 Double check each hand-counted value against `seed/data/games.ts` directly (not against `design.md`'s table, to avoid propagating a transcription error) before finalizing the assertions.

## 4. Verification

- [x] 4.1 Run `npm run test:unit` to confirm `player-stats.test.ts` and the new `player-stats.seed-verify.test.ts` pass.
- [x] 4.2 Run `npm run typecheck` and `npm run lint`.
- [x] 4.3 Run `npm run test:e2e` (or the relevant subset touching `/players/[id]`) to confirm the profile page still renders games-played correctly after switching its data source. Full-suite `fullyParallel` runs hit widespread, unrelated navigation-timeout failures (pre-existing: many workers against one dev server + shared MongoDB, not caused by this change); the relevant subset (`player-profile.spec.ts`, `record-and-edit-goals.spec.ts`, `record-and-edit-penalties.spec.ts`, `select-netminder-and-game-awards.spec.ts`) passes cleanly run individually.
