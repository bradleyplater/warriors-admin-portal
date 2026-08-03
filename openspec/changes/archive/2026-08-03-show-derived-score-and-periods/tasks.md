## 1. Derivation logic

- [x] 1.1 In `lib/derived/score.ts`, extend the `Score` interface with `periods: { team: number; opponent: number }[]` (length 3) and `shootout: { team: number; opponent: number } | null`.
- [x] 1.2 Add a period-bucketing helper (`period = Math.floor(minute / 20) + 1`) applied only to goals with `type !== "SO"`, and populate `periods` in `deriveScore`.
- [x] 1.3 Populate `shootout` from raw `SO`-type goal counts per side (`null` when neither side has any); leave the existing `team`/`opponent` total (+1 to the shootout winner) logic unchanged.
- [x] 1.4 Extend `lib/derived/score.test.ts` with cases: goals split across all three periods, a period with no goals on either side, an empty game (all periods 0-0, `shootout: null`), and `SO` goals excluded from `periods` while populating `shootout`.

## 2. Game detail page UI

- [x] 2.1 In `app/games/[id]/page.tsx`, render a scoreboard table (columns P1/P2/P3/Total, one row for the team and one for the opponent) below the existing `vs {opponent} — X-Y` header, using `score.periods` and the existing `score.team`/`score.opponent` totals.
- [x] 2.2 When `score.shootout` is non-null, render a one-line note identifying the shootout winner and tally (e.g. "Decided by shootout — Warriors won 1-0"); omit it entirely otherwise.

## 3. Verification

- [x] 3.1 Add an e2e spec (following the pattern in `e2e/select-netminder-and-game-awards.spec.ts`) that creates a game, records team and opponent goals across different periods plus a shootout goal, and asserts the period table and shootout note render correctly on `/games/[id]`.
- [x] 3.2 Extend the e2e spec (or add a case) confirming the breakdown updates after editing/deleting a goal that moves it to a different period.
- [x] 3.3 Run `npm run test:unit`, `npm run test:e2e`, `npm run typecheck`, and `npm run lint` to confirm everything passes.
