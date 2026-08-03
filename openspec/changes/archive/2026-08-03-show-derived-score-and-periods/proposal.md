## Why

The game detail page already shows the derived total score (`vs {opponent} — X-Y`), but has no period-by-period breakdown. KAN-24 requires the admin to see how the score built up across periods, with shootout results called out separately rather than folded silently into a period.

## What Changes

- `deriveScore` (`lib/derived/score.ts`) is extended to also return a `periods` array (3 entries, one per period) and a `shootout` result, alongside the existing `team`/`opponent` totals.
- Goals are bucketed into periods by a 20-minute running clock: minute 0–19 → P1, 20–39 → P2, 40–59 → P3. `SO`-type goals are excluded from all periods and instead populate `shootout`.
- The game detail page (`/games/[id]`) renders a scoreboard table (P1/P2/P3/Total columns, one row per side) below the existing header, with a note when a shootout decided the game.
- No change to `/games` (the games list) — it continues to show only the total score, per the existing requirement.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `game-management`: adds a requirement that the game detail page (`/games/[id]`) shows a period-by-period score breakdown derived from recorded goals, with shootout goals shown as a separate result rather than inside a period.

## Impact

- `lib/derived/score.ts` and `lib/derived/score.test.ts` — extend `Score` shape and its derivation/tests.
- `app/games/[id]/page.tsx` — render the new scoreboard table.
- `app/games/GamesTable.tsx` — no change (already uses `score.team`/`score.opponent`, which remain valid on the extended shape).
- No schema, repository, or server action changes — this is purely a derivation + rendering change over existing `Game` data.
