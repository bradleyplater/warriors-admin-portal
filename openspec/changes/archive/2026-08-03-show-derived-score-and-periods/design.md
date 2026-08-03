## Context

`deriveScore` (`lib/derived/score.ts`) already computes the total score from `Game.team.goals` / `Game.opponentTeam.goals`, per the derivation rule in `docs/03-data-model.md` ("Score" bullet). It only returns `{ team, opponent }`. Goals have no explicit `period` field — periods are inferred from `minute` (a 0–59 running clock for non-`SO` goals; `SO` goals sit outside that range and represent shootout attempts).

This is a small, single-module + single-page change: no new dependencies, no schema change, no migration. Documented here only because the apply workflow requires a design artifact before tasks.

## Goals / Non-Goals

**Goals:**
- Extend `deriveScore` to also return a 3-entry `periods` array and a `shootout` result, computed from the same goal arrays it already receives.
- Render a scoreboard table on `/games/[id]` showing the period breakdown and, when applicable, the shootout result.

**Non-Goals:**
- No change to `/games` (list page) — it keeps showing only the total score, per the existing "Each game row shows a derived score" requirement.
- No change to the `Game`/`Goal` schema or repositories — this is pure derivation over data that already exists.
- No handling of overtime periods — the data model caps non-SO goal minutes at 0–59 (3 × 20-minute periods), so there is no OT bucket to model.

## Decisions

- **Extend `Score` rather than add a sibling function.** `periods`/`shootout` are derived from the exact same two goal arrays `deriveScore` already takes, and every existing call site that wants the total can ignore the new fields. A separate `derivePeriods` would force every caller that wants both to invoke two functions and duplicate the SO-filtering logic. (Confirmed with the user during exploration.)
- **Period bucketing:** `period = Math.floor(minute / 20) + 1` for any goal with `type !== "SO"`, giving periods 1–3 for minutes 0–59 — matches `docs/03-data-model.md`'s "20-minute running-clock periods" rule and the existing `checkGoalRules` constraint that non-SO goals have `minute` in 0–59.
- **Shootout handling:** goals with `type === "SO"` are excluded from `periods` entirely and counted separately into `shootout: { team, opponent } | null` (the raw SO goal counts per side, not the derived +1). `shootout` is `null` when neither side recorded an SO goal, so the UI can omit the shootout note entirely for regulation games. The existing +1-to-winner logic for the `team`/`opponent` totals is unchanged.
- **UI placement:** a compact table (columns P1/P2/P3/Total, one row per side) directly under the existing `vs {opponent} — X-Y` header on `/games/[id]`, per the scoreboard mockup agreed with the user. A one-line note appears below the table only when `shootout` is non-null (e.g. "Decided by shootout — Warriors won 1-0").

## Risks / Trade-offs

- **Widening `Score`'s shape** touches every existing caller only in that they now receive extra fields; `GamesTable.tsx` destructures `score.team`/`score.opponent` only, so it's unaffected. Verified by reading its current usage.
- **Bucketing math duplicated understanding**: the 20-minute-period rule already lives in `docs/03-data-model.md` prose; this change is the first code to encode it. Kept as a small pure helper inside `score.ts` (not a new file) since it's only ever used there.
