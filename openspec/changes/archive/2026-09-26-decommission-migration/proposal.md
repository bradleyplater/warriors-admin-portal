## Why

The migration from the old admin system is finished in practice. The old admin system and its services are switched off, the website reads from S3 via the new publish pipeline, and all three reviews (D6 reconciliation, D8 active flags, D9 shirt numbers) are complete on production. What's left is the machinery and data that only existed to get us here:

- The Migration Review area now actively misleads. Games entered through the portal (3 so far) aren't reflected in the frozen legacy aggregates, so reconciliation compares against data that will never update.
- The frozen legacy fields were kept as a rollback safety net to the old system. That system is gone and doesn't know about the portal-entered games, so the safety net no longer works. Timestamped S3 backups are the real rollback now.

This is Step 6 (Cleanup) of `docs/04-migration-plan.md` and Phase 7 of `docs/07-build-roadmap.md`. It also brings forward the removal of the review UI, which that plan never scheduled explicitly.

## What Changes

**Production data (one-off, run once after a fresh backup; no script is committed):**
- `$unset` the legacy fields: `Player.position`, `Player.teams`, `Player.stats` (84 docs), `Game.score`, `Game.team.roster[].stats`, `Game.team.roster[].teamId` (88 docs), and `Team.players`, `Team.stats` (1 doc).
- `$unset` `number` on the 11 inactive players whose number is over 99. They will never be renumbered.
- Drop the `ApiKeys` collection (only used by the old services, now off) and the `reconciliationResolutions` collection (only used by the reconciliation review).

**Code removal:**
- Remove the Migration Review area: the nav item and `app/migration-review/` (reconciliation, active flags, shirt numbers).
- Remove `lib/migration/` in full, including the additive migration: there is nothing left to re-run.
- Remove the `migrate:*` npm scripts, the `ReconciliationResolution` schema, its repository and collection-name entry, and every migration test: unit, integration, and the `migration-review-*` e2e specs.
- Remove the legacy-shaped and drifted seed fixtures (legacy fields on seed players, `players[]`/`stats[]` on the seed team) and the legacy fields on the seed types.
- **BREAKING (data contract):** `Player.number`, when present, must now be 1–99 for every player, not only active ones. The inactive-player out-of-range exemption from KAN-36 goes, along with its e2e regression test and the `chromium-legacy-fixtures` Playwright project, once no spec needs it. A number is still required only for active players.
- The `players.json` publish contract (`PlayerArtifactSchema`) makes `number` optional, matching what the generator already emits for numberless inactive players.

**Docs:** mark Steps 4–6 done in `docs/04-migration-plan.md` and Phase 7 done in `docs/07-build-roadmap.md`, update `docs/03-data-model.md` (the legacy "Changes from today" and ApiKeys sections become history), and update the Obsidian vault to match.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `entity-schemas`: Player `number`, when present, must be 1–99 regardless of `active`. Presence is required only for active players; inactive players may have no number.
- `seed-data`: the "Legacy-shaped and drifted fixtures for migration testing" requirement is removed. The seed dataset instead must not carry legacy fields, and must include an inactive player with no number.

## Impact

- **Production MongoDB (`HockeyTracker`)**: a destructive, one-off write to Player, Game and Team, plus two dropped collections. Gated on a fresh `npm run backup:run` and sign-off on the exact commands.
- **Ordering constraint**: the prod data cleanup must run **before** the code change is deployed. The tightened number rule would otherwise fail `PlayerSchema` on the 11 inactive players over 99 and 500 `/players` (the same failure mode KAN-36 hit).
- **Published site**: the next publish's `players.json` drops `number` for those 11 inactive players. This is accepted; see design.md for the website-side check.
- **Code**: `app/layout.tsx`, `app/migration-review/**`, `lib/migration/**`, `lib/schemas/{player,reconciliation}.ts`, `lib/repositories/**`, `lib/publish/schemas.ts`, `seed/**`, `package.json`, `playwright.config.ts`, `tests/integration/**`, `e2e/**`.
- **Docs**: `docs/03`, `docs/04`, `docs/07`, and the Obsidian vault.
