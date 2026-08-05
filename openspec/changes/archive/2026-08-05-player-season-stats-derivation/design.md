## Context

`derivePlayerSeasonStats` (`lib/derived/player-stats.ts`) was built under KAN-20 and already computes goals, assists, points, PIMs, and Man of the Match / Warrior of the Game counts from `Game` documents, per `docs/03-data-model.md`'s "Derived stats" section. It takes a `games` array, `playerId`, and `seasonId`, and counts goals/assists/penalties/awards by matching `playerId` against `scoredBy`/`assist1`/`assist2`/`offender`/award fields — it never checks roster membership directly, relying on the schema constraint that these fields only ever reference rostered players.

The one caller, `app/players/[id]/page.tsx`, separately computes a roster-filtered `playerGames` array and uses `games.length` in the season header for the games-played count, rather than getting that number from the stats function.

`team-stats.seed-verify.test.ts` hand-verifies `deriveTeamSeasonStats` against documented totals from `seed/data/games.ts` as an independent oracle, distinct from the self-referential fixtures in `team-stats.test.ts`. `player-stats.test.ts` has no equivalent — its fixtures are all hand-built per test case, not checked against the shared seed data.

This is a small, single-module change: no schema change, no new dependency, no migration.

## Goals / Non-Goals

**Goals:**
- Add `gamesPlayed` to `PlayerSeasonStats`, computed by the function itself from roster membership, closing the last unmet line of KAN-25's acceptance criteria.
- Add a seed-data oracle test for player stats, mirroring `team-stats.seed-verify.test.ts`, closing KAN-25's "matches hand-calculated expectations for the seed data" criterion.

**Non-Goals:**
- No change to the UI beyond swapping the games-played count's data source (still plain text, same position).
- No change to `deriveTeamSeasonStats` or `team-stats.seed-verify.test.ts` — already correct, used only as a pattern reference.
- No reconciliation-report work (KAN-37) — the deliberately-drifted `legacyStats` in `seed/data/team.ts` is unrelated to this change.

## Decisions

- **`derivePlayerSeasonStats` becomes self-contained for roster checks, rather than trusting caller pre-filtering.** `gamesPlayed` is computed as `seasonGames.filter(g => g.team.roster.some(r => r.playerId === playerId)).length`. Alternative considered: keep relying on the caller to pass an already-player-filtered `games` array and just do `seasonGames.length`. Rejected because it re-introduces the same implicit-trust gap the AC is trying to close by stating "games played = games rostered" as a derivation rule, not a caller responsibility — and it would silently produce wrong `gamesPlayed` for any future caller that (unlike today's page) passes the unfiltered team games list.
- **Call site passes the full `games` array to the stats function, not the page's `playerGames`.** `app/players/[id]/page.tsx` keeps computing `playerGames` for the `GamesTable` list (a display concern: which games to list, in what order), but the `derivePlayerSeasonStats` call switches to the full `games` list now that the function filters by roster itself. This keeps "which games count toward this player's stats" defined in exactly one place.
- **Seed-verify oracle covers two rostered players plus one never-rostered player, across all four seeded seasons.** Every seeded game uses the same fixed `ROSTER` array (`seed/data/games.ts`), so any rostered player's `gamesPlayed` per season equals that season's total game count (SSN2223: 2, SSN2324: 2, SSN2425: 3, SSN2526: 3). Hand-counted from `seed/data/games.ts`:

  | Player | Season | goals | assists | points | pims | MOTM | WOTG | gamesPlayed |
  |---|---|---|---|---|---|---|---|---|
  | PLR100001 (Jamie Ashworth) | SSN2223 | 1 | 0 | 1 | 0 | 0 | 0 | 2 |
  | PLR100001 | SSN2324 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
  | PLR100001 | SSN2425 | 1 | 0 | 1 | 0 | 0 | 0 | 3 |
  | PLR100001 | SSN2526 | 0 | 1 | 1 | 0 | 0 | 0 | 3 |
  | PLR100014 (Chris Norbury) | SSN2223 | 0 | 1 | 1 | 0 | 0 | 1 | 2 |
  | PLR100014 | SSN2324 | 1 | 0 | 1 | 0 | 0 | 0 | 2 |
  | PLR100014 | SSN2425 | 1 | 0 | 1 | 0 | 0 | 0 | 3 |
  | PLR100014 | SSN2526 | 0 | 1 | 1 | 0 | 0 | 0 | 3 |
  | PLR100005 (Sam Elliston, never rostered) | every season | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

  PLR100001 and PLR100014 between them exercise goal-only, assist-only, and combined seasons, a zero season, and both award types; PLR100005 exercises the all-zero / never-rostered case (`gamesPlayed: 0` is the new behavior this change adds — today's `games.length`-in-the-page approach never renders a "0 games, not on this team" row, since the page only iterates `playerGames`, but the derivation function itself must still return zero correctly since callers other than this page may not pre-filter).

## Risks / Trade-offs

- **Redundant roster check**: today's page already pre-filters to `playerGames` before other logic (e.g. it still needs the roster-filtered list for `GamesTable`); after this change the stats function performs its own equivalent filter internally, so roster membership is effectively checked twice at this call site (once for the display list, once inside the stats function). Accepted — the two checks serve different purposes (which games to *list* vs. which games *count* toward stats) and the cost is a single `.some()` per game, negligible at this data volume.
- **Hand-counted oracle values could themselves contain arithmetic mistakes** — the same risk `team-stats.seed-verify.test.ts` already carries. Mitigated the same way: the oracle is derived independently from `seed/data/games.ts` by reading the raw goal/penalty/award entries directly (documented in this design doc), not by running the function under test and copying its output.
