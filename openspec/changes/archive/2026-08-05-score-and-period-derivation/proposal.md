## Why

KAN-27 ("Score and period derivation") asks for the rules that turn a game's recorded goals into its score and period-by-period line. That derivation already shipped under KAN-24 (`lib/derived/score.ts`, `deriveScore`) and is already specified in the `game-management` capability ("Each game row shows a derived score", "Game detail page shows a period-by-period score breakdown"). Closing KAN-27 honestly means checking its acceptance criteria against what exists rather than re-deriving it, and two concrete test-coverage gaps remain against `docs/05-testing-strategy.md`'s Tier 1 requirement to cover "boundary minutes" and provide oracle-verified confidence in the stats engine, matching the precedent set by `lib/derived/team-stats.seed-verify.test.ts` and `lib/derived/player-stats.seed-verify.test.ts`:

1. No test proves the exact period-boundary minutes (20, and the 39/40 seam) land in the correct adjacent period — existing tests stop at minute 19.
2. There is no `score.seed-verify.test.ts` hand-verifying `deriveScore` against real seeded games, unlike the sibling derive functions.

## What Changes

- Add unit tests to `lib/derived/score.test.ts` asserting that a goal at minute 20 lands in P2 (not P1) and a goal at minute 39 vs. minute 40 lands in P2 vs. P3 respectively.
- Add `lib/derived/score.seed-verify.test.ts` following the existing seed-verify pattern: hand-derive expected score/period/shootout output for a handful of games in `seed/data/games.ts`, independently cross-check the hand-derivation before hardcoding expected values, and assert `deriveScore`'s actual output against them.
- No production code changes — `deriveScore` in `lib/derived/score.ts` already implements the full KAN-27 acceptance criteria (non-shootout totals, shootout-winner +1, 20-minute running-clock period buckets). This change only closes the test-coverage gap.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `game-management`: the "Game detail page shows a period-by-period score breakdown" requirement gains an explicit scenario for the exact period-boundary minutes (20 and 39/40), so the spec states in prose what the new unit tests verify in code. No existing scenario's behavior changes.

## Impact

- `lib/derived/score.test.ts` — new boundary-minute test cases.
- `lib/derived/score.seed-verify.test.ts` — new file.
- No changes to `lib/derived/score.ts`, `app/games/[id]/page.tsx`, or any spec file.
