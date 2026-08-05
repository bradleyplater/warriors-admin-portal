## 1. Derivation logic

- [x] 1.1 In `lib/derived/team-stats.ts`, add `gamesPlayed: number` to the `TeamSeasonStats` interface.
- [x] 1.2 Compute `gamesPlayed` in `deriveTeamSeasonStats` as `seasonGames.length`.

## 2. Unit tests

- [x] 2.1 Extend `lib/derived/team-stats.test.ts`: `gamesPlayed` sums correctly across multiple games in a season (reuse/extend the existing "sums goals, assists, and PIMs across every game in the season" case).
- [x] 2.2 Add a genuine zero-games case: call `deriveTeamSeasonStats` with a `seasonId` that matches no game in the fixture array, and assert `gamesPlayed`, `goals`, `assists`, and `pims` are all zero. Distinct from the existing "only counts games within the requested season" case, which still leaves one in-season game with zero recorded stats.
- [x] 2.3 Confirm `gamesPlayed` is unaffected by games outside the requested season (reuse the existing season-filter fixture).

## 3. Seed-data oracle test

- [x] 3.1 Count games per season directly from `seed/data/games.ts` (e.g. count `seasonId` occurrences), independent of the derivation function under test.
- [x] 3.2 Extend `lib/derived/team-stats.seed-verify.test.ts`'s `it.each` table with `gamesPlayed` per season, updating the leading comment to document the hand-counted values.

## 4. Spec sync

- [x] 4.1 Confirm `openspec/specs/stats-engine/spec.md`'s "Per-team season totals" requirement reflects the `gamesPlayed` addition once this change is archived (via `openspec archive` / `opsx:sync`), matching this change's `specs/stats-engine/spec.md` delta.

## 5. Verification

- [x] 5.1 Run `npm run test:unit` to confirm `team-stats.test.ts` and `team-stats.seed-verify.test.ts` pass.
- [x] 5.2 Run `npm run typecheck` and `npm run lint`.
- [x] 5.3 Confirm no other file imports `deriveTeamSeasonStats` and needs updating for the new `gamesPlayed` field (expected: none, per design.md).
