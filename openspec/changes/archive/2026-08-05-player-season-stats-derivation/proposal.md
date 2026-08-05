## Why

KAN-25 ("Player season stats derivation") asks for goals, assists, points, PIMs, games played, and Player of the Game / Warrior of the Game counts to be derived from `Game` documents, with results matching hand-calculated expectations for the seed data. Everything except `gamesPlayed` and a seed-data oracle check was already built and shipped under KAN-20 (`derivePlayerSeasonStats` in `lib/derived/player-stats.ts`, rendered on `/players/[id]`). This change closes the two remaining gaps so KAN-25's acceptance criteria are fully met by the derivation function itself, not partly by page-level filtering.

## What Changes

- `derivePlayerSeasonStats` gains a `gamesPlayed` field, computed by checking roster membership internally (`game.team.roster.some(r => r.playerId === playerId)`) rather than relying on the caller to pre-filter to the player's games.
- `app/players/[id]/page.tsx` renders `stats.gamesPlayed` instead of the season section's own `games.length` count. The stats call now receives the full `games` list (not the page's pre-filtered `playerGames`), since the function is self-contained; `playerGames` remains as-is for the per-season game list rendered by `GamesTable`, which is a display concern separate from the derived count.
- A new `lib/derived/player-stats.seed-verify.test.ts` hand-verifies `derivePlayerSeasonStats` against `seed/data/games.ts`, mirroring `team-stats.seed-verify.test.ts`'s pattern: documented, independently hand-counted expected values per player per season, used as an oracle check distinct from the existing self-referential unit tests.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `stats-engine`: `derivePlayerSeasonStats` additionally returns `gamesPlayed` (count of games in the season where the player was rostered), computed by the function itself rather than by its caller.

`player-profile` is not listed here: the observable behavior (the season section shows a count of games rostered in that season) is unchanged — only its implementation source moves from page-level filtering to the stats function.

## Impact

- `lib/derived/player-stats.ts` and `lib/derived/player-stats.test.ts` — extend `PlayerSeasonStats` shape, derivation logic, and unit tests.
- `lib/derived/player-stats.seed-verify.test.ts` — new file, no production code impact.
- `app/players/[id]/page.tsx` — switch from page-level game filtering + `games.length` to `stats.gamesPlayed`; the games list rendered per season (via `GamesTable`) is unaffected, only the count label changes source.
- No schema, repository, or server action changes — this is purely a derivation change over existing `Game` data.
