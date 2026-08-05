## Why

KAN-26 ("Team season stats derivation") asks for games played, goals, assists, and penalty minutes to be derived from `Game` documents per season, with bench PIMs included and results matching hand-calculated expectations for the seed data. Everything except `gamesPlayed` and explicit zero-games coverage was already built and shipped under KAN-20 (`deriveTeamSeasonStats` in `lib/derived/team-stats.ts`, plus its seed-data oracle test). This change closes the one remaining gap so KAN-26's acceptance criteria are fully met by the derivation function itself.

## What Changes

- `deriveTeamSeasonStats` gains a `gamesPlayed` field, computed as `seasonGames.length` — simpler than the player-side equivalent since team stats need no roster-membership check, only the existing season filter.
- `lib/derived/team-stats.test.ts` gains coverage for `gamesPlayed` summing correctly across games, and a genuine zero-games case (a season ID that matches no games at all, distinct from the existing "one game in-season, zero recorded stats" case).
- `lib/derived/team-stats.seed-verify.test.ts` gains hand-verified `gamesPlayed` expectations per season (SSN2223: 2, SSN2324: 2, SSN2425: 3, SSN2526: 3 — counted directly from `seed/data/games.ts`).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `stats-engine`: the "Per-team season totals are derived from games" requirement gains games played (count of games in the season), matching how the player-side requirement already documents `gamesPlayed`. Adds a scenario for a season with zero games returning all-zero totals.

## Impact

- `lib/derived/team-stats.ts` and `lib/derived/team-stats.test.ts` — extend `TeamSeasonStats` shape, derivation logic, and unit tests.
- `lib/derived/team-stats.seed-verify.test.ts` — extend existing oracle test with `gamesPlayed` per season.
- No schema, repository, server action, or UI changes — this is purely a derivation change over existing `Game` data. No page renders team season stats today, and this change does not add one (deferred since KAN-20/KAN-21 — out of scope unless raised separately).
