# 04 — Migration Plan

How the existing `HockeyTracker` data moves to the target shape in [03 — Data Model](03-data-model.md) **without corrupting anything**. The guiding rules:

1. **Backup before every mutating step** (`mongodump`, timestamped, kept until decommission).
2. **Additive first, destructive last.** New fields are added alongside old ones; old fields are only dropped after the new system has proven parity.
3. **Every script is idempotent and has a dry-run mode** that prints what it *would* change.
4. **Nothing is overwritten without sign-off.** Discrepancies are reported, and you approve each resolution.
5. **The old services stay untouched and runnable until Phase 7 of the [roadmap](07-build-roadmap.md).**

## Known discrepancies (found during analysis, 2026-07-04)

These are the seed cases the reconciliation step must surface and resolve:

| Where | Stored | Recomputed from games |
|---|---|---|
| Player `PLR562272` 24/25 games played | Player doc: 10 · Team copy: 9 | **10** |
| Team games played 22/23 | 16 | **17** games exist |
| Team games played 23/24 | 25 | **24** games exist |
| Team games played 24/25 | 24 | **25** games exist |

Also known going in: 8 position spellings to normalise; 14 players with numbers > 99; `challenge` game type lowercase; some player-season stat entries missing `manOfTheMatch`/`warriorOfTheGame` fields (treated as 0 by the recompute).

## Steps

### Step 0 — Freeze & capture

- Full `mongodump` of `HockeyTracker`.
- Capture the current website JSON files from the website repo as **golden fixtures** (checked into this repo under `fixtures/golden/`). These define the publish contract.
- From this point, data entry continues in the old system as normal — migration scripts are re-runnable, so we re-execute them at cutover against fresh data.

### Step 1 — Additive schema migration (no data loss possible)

Script `migrate-01-additive`:

- `Player`: add `positions` (parsed from `position`), `number` + `teamId` (lifted from `teams[0]`), `createdAt`/`updatedAt`. Old `position`, `teams`, `stats` remain untouched.
- `Game`: add normalised `type` casing (`challenge` → `CHALLENGE`) — written to the same field only after dry-run review, since it's a value normalisation, not a structural change. Add audit timestamps.
- `Seasons`/`Team`: add audit timestamps.

Position mapping (deterministic, reviewed via dry-run output):

| Stored value | → positions |
|---|---|
| `Forward` | `[Forward]` |
| `Defence` | `[Defence]` |
| `Goaltender` | `[Goaltender]` |
| `Forward / Defence`, `Defence / Forward` | `[Forward, Defence]` / `[Defence, Forward]` |
| `Defence / Goaltender`, `Defence/Goaltender` | `[Defence, Goaltender]` |
| `Goalie / Defence` | `[Goaltender, Defence]` |

### Step 2 — Interactive reviews (in the portal, before cutover)

The portal ships a one-time **Migration Review** area with two checklists:

1. **Active flags (D8):** all 84 players listed (pre-sorted by whether they played in 25/26 as a hint); you set Active/Inactive for each. Nothing proceeds until every player is marked.
2. **Shirt numbers (D9):** the 14 players with numbers > 99 (134, 170, 250, 333, 900, 101, 102, 105, 106, 107, 110, 112, 113, 114) listed for you to assign new 1–99 numbers, with clash detection against active players.

### Step 3 — Reconciliation report (D6 sign-off gate)

Script `migrate-03-reconcile` recomputes, from `Game` documents alone:

- every player's per-season stats vs the stored `Player.stats` **and** the `Team.players[].stats` copy;
- team per-season stats vs stored `Team.stats`;
- every game's score and period line vs the stored `score` field (validates the 20-minute derivation rule across all 85 games, including the 5 shootout goals).

Output: a report of every mismatch with both values. For each you choose:

- **Accept computed** — the game records are right; stored aggregate was drifted (expected for the known cases above), or
- **Fix the games** — a game record is wrong/missing (e.g. a roster entry was never recorded); you correct the game in the portal and re-run reconciliation.

The gate: **reconciliation must run clean (all mismatches resolved) before cutover.** If a stored stat turns out to have no possible backing game record, that is a scope escalation — we would revisit the "adjustments ledger" option rather than invent game data.

### Step 4 — Cutover

- Re-run Steps 1–3 against the final data snapshot (scripts are idempotent).
- Data entry in the old system stops.
- The portal becomes the write path. It reads/writes only the new fields.
- Old fields (`Player.position`, `Player.teams`, `Player.stats`, `Team.players`, `Team.stats`, `Game.score`, `Game.team.roster[].stats`) are **kept frozen** — not read, not written — as a rollback safety net.

### Step 5 — Publish parity

- The publish service generates all JSON artifacts and diffs them against the golden fixtures.
- Expected result: byte-identical output apart from approved differences (e.g. corrected drifted stats — each such diff is reviewed and traceable to a Step 3 resolution).
- The website is switched to the S3/CDN URL only after you approve the diff.

### Step 6 — Cleanup (destructive, last)

After an agreed bedding-in period with the new system live:

- Script `migrate-06-cleanup` drops the frozen legacy fields (fresh backup first).
- `ApiKeys` collection deleted.
- Old admin services decommissioned.

## Rollback story

| Failure point | Rollback |
|---|---|
| Steps 1–3 | Nothing destructive has happened; old system still primary. Restore from dump only if additive fields somehow cause trouble (they shouldn't — old system ignores unknown fields; verify this assumption on a staging copy first). |
| Step 4–5 | Old fields are frozen but intact and the old services still exist — point the website back at the repo JSON and resume the old workflow. |
| Step 6 | Timestamped dumps retained; restore restores everything. |

## Testing the migration itself

Every script runs in CI against a Docker MongoDB seeded with a **sanitised copy of the real production shapes** (same structures, same edge cases: bench penalties, missing award fields, out-of-range numbers, all 8 position spellings, shootout goals). See [05 — Testing Strategy](05-testing-strategy.md).
