## Context

`deriveTeamSeasonStats` (`lib/derived/team-stats.ts`) was built under KAN-20 and already computes goals, assists, and PIMs (bench included) from `Game` documents, per `docs/03-data-model.md`'s "Derived stats" section. It takes a `games` array and `seasonId`, filters to `seasonGames`, and sums goals/assists/penalty durations across them — there's no team-ID parameter since the app has exactly one team.

`docs/03-data-model.md:191` documents "games played = games in season" as part of the team stats rule, but the function has never computed it, and `openspec/specs/stats-engine/spec.md`'s "Per-team season totals" requirement doesn't mention it either — the same spec/implementation drift KAN-25 closed on the player side (`gamesPlayed` there needed a roster-membership check; here it doesn't, since a team game either belongs to the season or it doesn't, with no per-entity filtering).

`team-stats.seed-verify.test.ts` already hand-verifies goals/assists/PIMs against `seed/data/team.ts`'s documented totals, independent of the self-referential fixtures in `team-stats.test.ts`. Neither test file currently exercises a season with zero games — the closest existing case (`"only counts games within the requested season"`) still leaves one in-season game with no recorded stats, not zero games.

This is a small, single-module change: no schema change, no new dependency, no migration.

## Goals / Non-Goals

**Goals:**
- Add `gamesPlayed` to `TeamSeasonStats`, computed as `seasonGames.length`, closing the last unmet line of KAN-26's acceptance criteria.
- Add explicit unit-test coverage for a season with literally zero games (all fields zero), which KAN-26's acceptance criteria calls out by name and which no existing test actually exercises.
- Extend the seed-data oracle test with hand-counted `gamesPlayed` per season.

**Non-Goals:**
- No team-stats display page. `deriveTeamSeasonStats`'s output has never been rendered anywhere (deferred since KAN-20/KAN-21); KAN-26's acceptance criteria only requires correct derivation and tests, not a visible surface.
- No change to `derivePlayerSeasonStats` or `player-stats.seed-verify.test.ts` — already correct, unrelated to this change.
- No reconciliation-report work (KAN-37) — the deliberately-drifted `legacyStats` in `seed/data/team.ts` (goals/assists/PIMs only, no gamesPlayed field) is unrelated to this change.

## Decisions

- **`gamesPlayed` is `seasonGames.length`, with no roster or team-ID check.** Alternative considered: mirror the player-side pattern and filter by `game.team.id` explicitly, for symmetry. Rejected — the app has exactly one team, every seeded/production `Game` belongs to it, and `deriveTeamSeasonStats`'s existing goals/assists/PIMs loops already make this same assumption (they never check `game.team.id` either). Adding a team-ID filter here alone, without threading a `teamId` parameter through the rest of the function, would be inconsistent; doing it everywhere is out of scope for a `gamesPlayed`-only ticket.
- **Zero-games test uses a `seasonId` that matches no game in the fixture array, not an empty games array.** This exercises the real-world shape (a `games` list containing other seasons' games, filtered down to nothing for the requested season) rather than the degenerate empty-array case, matching how `derivePlayerSeasonStats`'s existing "never rostered" test is built.
- **Seed-verify oracle reuses the same per-season game counts already hand-verified for KAN-25's player oracle.** Every seeded game uses the same team, so `gamesPlayed` per season is exactly the season's total game count: SSN2223: 2, SSN2324: 2, SSN2425: 3, SSN2526: 3 (counted directly from `seed/data/games.ts`, matching the table already in the archived `player-season-stats-derivation` design doc).

## Risks / Trade-offs

- **Hand-counted oracle values could themselves contain arithmetic mistakes** — the same risk the existing `team-stats.seed-verify.test.ts` and `player-stats.seed-verify.test.ts` already carry. Mitigated the same way: counted directly from `seed/data/games.ts`'s raw entries (`grep -c` on `seasonId` occurrences), not by running the function under test and copying its output.
- **`TeamSeasonStats` shape change is a breaking change for any caller destructuring the exact field set** — low risk, since `deriveTeamSeasonStats` has no callers today outside its own test files (confirmed no page imports it).
