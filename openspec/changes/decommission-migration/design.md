## Context

The migration plan (`docs/04-migration-plan.md`) is complete up to and including Step 5, although the docs still describe Steps 4–5 as future work:

- **Step 1 (additive)**: ran on prod on 2026-08-21.
- **Steps 2–3 (D8/D9 reviews, D6 reconciliation)**: all complete on prod. Checked 2026-09-26: 0 players without `active`, 0 active players with a missing or out-of-range number, every reconciliation mismatch resolved.
- **Step 4 (cutover)**: the old admin system and services are switched off and unused.
- **Step 5 (publish parity)**: the website reads from S3 via the portal's publish pipeline.

Prod state as of 2026-09-26 (read-only counts):

| What | Count |
|---|---|
| Players with any of `position`/`teams`/`stats` | 84 / 86 (the other 2 were created through the portal) |
| Games with any of `score`/`team.roster.stats`/`team.roster.teamId` | 88 / 91 (the other 3 were entered through the portal) |
| Team doc with `players`/`stats` | 1 / 1 |
| Inactive players with `number > 99` | 11 |
| Players with no `number` | 0 |
| `ApiKeys` docs | 1 |

No portal code reads any legacy field. Stats, team stats, scores and every publish artifact are derived from `Game` documents (`lib/derived/*`, `lib/publish/artifacts/*`). The only readers of the legacy data are the Migration Review area and `lib/migration/reconcile`, both of which this change removes.

## Goals / Non-Goals

**Goals:**
- Prod holds only target-shape data (`docs/03-data-model.md`), with no legacy fields or legacy collections.
- The repo holds no migration machinery: no review UI, migration library, scripts, tests or legacy seed fixtures.
- Every stored `Player.number` is a valid 1–99, so the schema can say so unconditionally.
- The docs and the vault describe the migration as finished.

**Non-Goals:**
- Any ongoing drift or consistency check. The user decided none is needed once the legacy aggregates are gone.
- Renaming the capitalised legacy collection names (`Player`, `Game`, `Team`, `Seasons`). They are the real names and stay.
- Changing the website repo.
- Updating the openspec specs that still say MinIO after the Moto switch. That's a separate, unrelated doc fix.

## Decisions

### D1. The prod cleanup is a one-off with no committed script
The user decided a script that only ever runs once shouldn't live in the repo. The exact commands are recorded below, and that record serves as the audit trail. They run from a throwaway Node script in the session scratchpad using the `mongodb` driver, with the prod connection string loaded via `scripts/with-env.mjs .env.production.local`.

- *Alternative:* a committed `migrate-06-cleanup` with dry-run and integration tests, per the migration plan's principle 3. Rejected by the user: the run is one-time, the dry-run is done manually below, and the backup covers failure.

### D2. Prod data cleanup runs before the code change ships
The tightened number rule (D4) would make `PlayerSchema.parse` throw on the 11 inactive players over 99, which would 500 `/players` and every page that validates the full player list. Running the cleanup first is safe with the **current** code:
- The current code already handles documents with no legacy fields (the 3 portal-entered games prove it) and inactive players with no number (KAN-36; the UI renders `—`, and `compareByShirtNumber` sorts them last).
- In the window between cleanup and merge, the still-present reconciliation page may show meaningless mismatches. That's harmless because nobody acts on it.

### D3. Removing the 11 out-of-range inactive numbers bumps `updatedAt`; unsetting legacy fields does not
Removing a number is a real change to the target-shape data, and it changes the published `players.json`. The legacy-field unsets don't touch any target-shape field, so their `updatedAt` stays as it is.

### D4. The number rule becomes "optional, but valid 1–99 if present; required when active"
`PlayerShape.number` becomes `ShirtNumberSchema.optional()`, and `requireNumberWhenActive` keeps enforcing presence for active players. The KAN-36 comments describing stale out-of-range values on inactive players are removed.
- *Alternative:* keep the lenient `IntegerSchema.optional()`. Rejected: after the cleanup no such data exists, and keeping the exemption would let bad numbers creep back in.

### D5. The additive migration is removed too, not kept for re-runs
Its only purpose was re-running at cutover, and cutover is done. It's removed along with its tests and the `migrate:additive:*` scripts.

### D6. `PlayerArtifactSchema.number` becomes optional
The `players.json` generator already omits `number` when it's undefined (`lib/publish/artifacts/players.ts`), but the contract schema, copied from the original golden fixture, still requires it. Until now no numberless player existed in any dataset, so nothing exercised this. The contract schema is changed to match reality, and a test with a numberless inactive player covers it.

### D7. Seed data gets a numberless inactive player
This replaces the removed legacy fixtures as the edge case worth seeding: it's the real prod shape after cleanup, and every page, derived stat and publish artifact should handle it.

### D8. Playwright's `chromium-legacy-fixtures` project goes once it's empty
Its three specs are `migration-review-active`, `migration-review-number` (both deleted) and `roster-list`. `roster-list` is only there because of its KAN-36 regression test, which writes an out-of-range number directly to the DB. That test is replaced with a "numberless inactive player renders" test, which uses the numberless seed player and is valid under the new schema, so it can run in parallel. With all three gone, the project and the `LEGACY_FIXTURE_SPECS` comment go too.

## Prod cleanup commands (for sign-off)

All commands target the `HockeyTracker` database on the prod connection.

**0. Backup**
```
node scripts/with-env.mjs .env.production.local npm run backup:run
```
Record the backup prefix, then check that the manifest lists all 7 collections: `Player`, `Game`, `Team`, `Seasons`, `publishes`, `reconciliationResolutions`, `ApiKeys`.

**1. Dry run.** Counts only, expected values from Context above:
```js
Player.countDocuments({ $or: [{ position: {$exists: true} }, { teams: {$exists: true} }, { stats: {$exists: true} }] })   // 84
Player.countDocuments({ active: false, number: { $gt: 99 } })                                                       // 11
Game.countDocuments({ $or: [{ score: {$exists: true} }, { "team.roster.stats": {$exists: true} }, { "team.roster.teamId": {$exists: true} }] })  // 88
Team.countDocuments({ $or: [{ players: {$exists: true} }, { stats: {$exists: true} }] })                            // 1
Player.countDocuments({ number: { $exists: true, $not: { $gte: 1, $lte: 99 } } })                                   // 11 (should equal the > 99 count)
```
If any count differs from what's expected, stop and review before applying.

**2. Apply**
```js
Player.updateMany(
  { $or: [{ position: {$exists: true} }, { teams: {$exists: true} }, { stats: {$exists: true} }] },
  { $unset: { position: "", teams: "", stats: "" } })
Player.updateMany(
  { active: false, number: { $gt: 99 } },
  { $unset: { number: "" }, $set: { updatedAt: new Date() } })
Game.updateMany(
  { $or: [{ score: {$exists: true} }, { "team.roster.stats": {$exists: true} }, { "team.roster.teamId": {$exists: true} }] },
  { $unset: { score: "", "team.roster.$[].stats": "", "team.roster.$[].teamId": "" } })
Team.updateMany({}, { $unset: { players: "", stats: "" } })
db.dropCollection("ApiKeys")
db.dropCollection("reconciliationResolutions")
```

**3. Verify**
- Every dry-run count is now 0.
- `listCollections` returns only `Player`, `Game`, `Team`, `Seasons`, `publishes`.
- Player, Game, Team and Season counts are unchanged (86 / 91 / 1 / 4).
- Every Player doc passes the **new** number rule, and every Player and Game doc passes the current `PlayerSchema` and `GameSchema`.
- Smoke-test the portal against prod (`npm run dev:prod`): `/players`, a player profile, `/games`, a game page.
- A publish preview generates cleanly. The only diff should be the 11 players losing `number` in `players.json`.

## Risks / Trade-offs

- **[The website may not handle a player without `number`]**: the site was built against the golden fixture, where every player has one, so it might render `#undefined` or fail to render. → Before the first real publish after cleanup, check how the website repo renders a player without `number`. The user has accepted the number disappearing, so this is a rendering check, not a scope question. If the site mishandles it, fix it on the website side (a separate repo).
- **[A command removes more than intended]** → A fresh backup first (step 0), an expected-count dry run (step 1), and every filter targets only the listed fields. Rollback: `npm run backup:restore -- --prefix=<step-0 prefix> --allow-remote`.
- **[The code change merges before the prod cleanup runs]** → `/players` 500s on prod. Mitigation: the task order puts the prod cleanup first, and the PR description repeats the constraint.
- **[Losing the audit trail of reconciliation decisions]** by dropping `reconciliationResolutions` → accepted: they justified one-time changes that the backups still contain.
- **[The historical shirt numbers of the 11 players are lost from live data]** → accepted by the user; they remain in the step-0 backup.

## Migration Plan

1. Get sign-off on this design, including the commands above.
2. Back up, dry-run, apply and verify on prod (steps 0–3 above), then record the backup prefix and the counts in `tasks.md`.
3. Open a PR with the code removal, schema tightening, seed changes and docs. CI must be green.
4. Merge. The portal on prod now matches the data.
5. Check how the website renders a player without `number`, then publish.

**Rollback:** before step 4, restore the step-0 backup (the old code still works). After step 4, revert the PR and then restore the backup.

## Open Questions

- None blocking. The website rendering check (see Risks) is a verification step, not an open decision.
