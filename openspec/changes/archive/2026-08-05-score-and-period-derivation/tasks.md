## 1. Boundary-minute unit tests

- [x] 1.1 Add a test to `lib/derived/score.test.ts` asserting a team goal at minute 20 lands in P2 (not P1)
- [x] 1.2 Add a test asserting a team goal at minute 39 lands in P2 and a team goal at minute 40 lands in P3
- [x] 1.3 Run `npm run test:unit` and confirm both new assertions pass against the existing `deriveScore` implementation (no production code change expected)

## 2. Seed-verify oracle test

- [x] 2.1 Hand-derive expected `deriveScore` output (team/opponent totals, all 3 periods, shootout or null) for `GME100001`, `GME100005`, and `GME100010` from `seed/data/games.ts`
- [x] 2.2 Independently re-derive each expected value a second time (separate pass, not re-reading the first) and confirm both derivations agree before hardcoding
- [x] 2.3 Create `lib/derived/score.seed-verify.test.ts` following the structure of `lib/derived/team-stats.seed-verify.test.ts` / `lib/derived/player-stats.seed-verify.test.ts`, importing `games` from `seed/data/games` and asserting `deriveScore` against the verified expected values, with each expectation commented with the minute/type math that produced it
- [x] 2.4 Run `npm run test:unit` and confirm the new file passes

## 3. Spec sync

- [x] 3.1 Run `npm run lint` and `npm run typecheck` to confirm no regressions
- [ ] 3.2 Sync the `game-management` delta spec (new boundary scenario) into `openspec/specs/` via `/opsx:sync` or archive, once implementation is verified
