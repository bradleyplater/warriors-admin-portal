## Context

`deriveScore` (`lib/derived/score.ts`) buckets goals into periods with `Math.floor(minute / 20)` and totals sides as non-SO goal counts plus a shootout-winner bonus. `lib/derived/score.test.ts` already covers no-goals, regulation-only totals, shootout-winner, a combined mixed game, and shootout exclusion from periods — but every period-bucketing test uses minute 5, 19, 25, or 45, never the boundary minutes themselves (20, 39, 40). Separately, `team-stats` and `player-stats` each have a `*.seed-verify.test.ts` sibling that hand-verifies the derive function against `seed/data/games.ts`; `score` has no such file.

`seed/data/games.ts` has 10 games. Only one (`GME100005`) has any `SO`-type goals, making it the only seeded game exercising the shootout path.

## Goals / Non-Goals

**Goals:**
- Prove the P1/P2 boundary (minute 19 vs. 20) and the P2/P3 boundary (minute 39 vs. 40) bucket correctly, closing the literal "boundary times bucket correctly" acceptance criterion.
- Add a `score.seed-verify.test.ts` that hand-derives and independently cross-checks expected `deriveScore` output for a small set of real seeded games, then asserts against it — same shape as the existing seed-verify tests.

**Non-Goals:**
- No changes to `deriveScore` itself — its behavior already matches `docs/03-data-model.md`'s Derived stats → Score section and the `game-management` spec.
- No reconciliation script (`migrate-03-reconcile`) — that's unbuilt, Phase 6 work; this change doesn't attempt to simulate it. If `deriveScore`'s current signature (raw goal arrays rather than a full `Game`) turns out to be awkward for that future script, it's a decision for that later ticket, not this one.

## Decisions

**Boundary tests go in `score.test.ts`, not a new file.** They're unit tests of the same pure function the existing file already covers; splitting them out would just fragment one function's coverage across two files for no reason.

**Seed-verify picks 3 of the 10 seeded games, chosen for coverage, not convenience:**
- `GME100001` — two-sided, two-period game (team goals at minute 12 → P1 and minute 28 → P2; opponent goal at minute 40 → P3), no shootout. Also exercises the P2/P3 boundary minute (40) in real fixture data, not just a synthetic unit test.
- `GME100005` — the only seeded game with `SO` goals: team has 1 regulation (min 8) + 1 SO goal, opponent has 1 regulation (min 50) + 0 SO goals. Verifies the shootout-winner bonus and SO-exclusion-from-periods end to end.
- `GME100010` — team goals at minute 21 (just past the P1/P2 boundary → P2) and minute 58 (→ P3), opponent goal at minute 40 (→ P3), no shootout. Reinforces boundary-adjacent minutes with a different game than `GME100001`.

Each expected value is derived by hand from the fixture source, then re-derived independently (a second pass, not just re-reading the first) before being hardcoded — the same double-check discipline used for the existing player/team seed-verify tests, since a seed-verify test that's wrong in the same way as the code under test proves nothing.

## Risks / Trade-offs

- **Fixture drift**: if `seed/data/games.ts` changes later, the seed-verify test's hardcoded expectations could silently stop matching the intent (though a real behavior change would still fail the test correctly). Mitigated by commenting each expected value inline with the minute/type math that produced it, same as the existing seed-verify tests do.
- **Only one seeded game has a shootout**: coverage of shootout *ties* (equal SO goals both sides) stays purely in `score.test.ts`'s existing synthetic tests, since no seeded game has a tied shootout. Acceptable — seed-verify is about oracle-checking against real data, not exhausting every branch.
