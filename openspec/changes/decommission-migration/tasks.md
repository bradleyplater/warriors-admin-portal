## 1. Prod data cleanup (before any code change ships — design D2)

- [x] 1.1 Get the user's sign-off on the prod cleanup commands in design.md
  - Approved 2026-09-26, after the backup and dry run
- [x] 1.2 Run `npm run backup:run` against prod and confirm the manifest lists all 7 collections; record the backup prefix here
  - 2026-09-26 via `npm run backup:run:prod`: prefix `backups/2026-09-26T11-43-14-422Z`. Seasons 4, reconciliationResolutions 146, publishes 6, Player 86, Team 1, Game 91, ApiKeys 1
- [x] 1.3 Dry run: run the design.md step-1 counts against prod and confirm they match the expected values (84 / 11 / 88 / 1 / 11); stop and review if any differ
  - 2026-09-26: 84 / 11 / 88 / 1 / 11, all as expected. The other 2 of 86 players have no legacy fields (created through the portal)
- [x] 1.4 Apply the design.md step-2 commands from a throwaway scratchpad script; record each `matchedCount`/`modifiedCount` here
  - 2026-09-26: Player legacy 84/84, inactive numbers 11/11, Game 88/88, Team 1/1 (matched/modified); ApiKeys and reconciliationResolutions dropped
- [x] 1.5 Verify (design.md step 3): all dry-run counts are 0, only the 5 target collections remain, document totals are unchanged, and every Player/Game doc parses (Players under the new 1–99 rule)
  - All 5 counts 0; collections are Game, Player, Seasons, Team, publishes; totals 86/91/1/4 unchanged; all 86 players, 91 games, the team and 4 seasons pass their schemas; 11 players now numberless
- [x] 1.6 Smoke-test the portal against prod (`npm run dev:prod`): `/players`, a player profile, `/games`, a game page, and a publish preview whose only diff is the 11 players losing `number`
  - Checked through the already-running prod-connected dev server on :3000: numberless profiles PLR339883 and PLR477581, the newest and oldest games, /players and /seasons all return 200. Preview vs live S3: players.json differs only in those 11 numbers; roster-config, team and results are identical

## 2. Remove the Migration Review area

- [x] 2.1 Remove the "Migration review" nav item from `app/layout.tsx`
- [x] 2.2 Delete `app/migration-review/` (reconciliation, active, shirt-number, the layout and `ReviewProgress`)
- [x] 2.3 Delete `e2e/migration-review-active.spec.ts` and `e2e/migration-review-number.spec.ts`

## 3. Remove the migration library and reconciliation persistence

- [x] 3.1 Delete `lib/migration/` (active-review, number-review, reconcile, additive) and their unit tests
- [x] 3.2 Delete `lib/schemas/reconciliation.ts` and its test, and remove their exports from `lib/schemas` and any index
- [x] 3.3 Delete `lib/repositories/reconciliation-resolutions.ts` and its collection-name entry, and remove its exports from `lib/repositories/index.ts`
- [x] 3.4 Delete `tests/integration/migration-*.test.ts` and `tests/integration/repositories/reconciliation-resolutions.test.ts`
- [x] 3.5 Remove the `migrate:*` scripts from `package.json`
- [x] 3.6 Grep for leftover references (`migration-review`, `lib/migration`, `Reconciliation`, `reconciliationResolutions`, `migrate:`) and clean up stale comments that point at removed code

## 4. Tighten the Player number rule

- [x] 4.1 In `lib/schemas/player.ts`, make `number` `ShirtNumberSchema.optional()` (valid 1–99 whenever present); keep `requireNumberWhenActive` for presence; update the KAN-36 comments
- [x] 4.2 Unit tests in `lib/schemas/player.test.ts`: an inactive player with 134 is rejected, an inactive player with no number passes, an active player with no number is rejected
- [x] 4.3 Make `PlayerArtifactSchema.number` optional in `lib/publish/schemas.ts`; add a `players.ts` artifact test with a numberless inactive player that validates against the contract schema and emits no `number` key
- [x] 4.4 Update comments that describe out-of-range legacy numbers (e.g. `lib/derived/player-order.ts`, `lib/publish/artifacts/roster-config.ts`) so they describe only the numberless-inactive case

## 5. Seed data and test harness

- [x] 5.1 Remove the legacy fields from the `seed/data/players.ts` fixtures (`PLR100018`, `PLR100019`) and the `players[]`/`stats[]` arrays from `seed/data/team.ts`
- [x] 5.2 Remove `LegacyStatsLine` and the legacy optional fields from `seed/types.ts`, and make `Player.number` optional there
- [x] 5.3 Add a seeded inactive player with no `number`; fix any seed-verify or e2e assertions that count players or depend on seed numbers
- [x] 5.4 Add a seed test for the new seed-data requirement: no legacy fields, and a numberless inactive player present
- [x] 5.5 In `e2e/roster-list.spec.ts`, replace the KAN-36 out-of-range regression test with "a numberless inactive player renders in the Inactive section with `—`", using the seed player instead of a direct DB write
- [x] 5.6 Remove the `chromium-legacy-fixtures` project and `LEGACY_FIXTURE_SPECS` from `playwright.config.ts`
- [ ] 5.7 Run lint, typecheck, `test:unit`, `test:integration` and `test:e2e` locally; all green
  - 2026-09-26: lint (0 errors), typecheck, unit (271) and integration (72) green locally on a fresh seed. e2e NOT run locally: the :3000 server is a prod-connected `next dev` and Playwright reuses it outside CI, so e2e would write to prod. e2e runs in CI on the PR instead

## 6. Docs

- [x] 6.1 `docs/04-migration-plan.md`: mark Steps 4–6 done with dates, note that the review UI is gone and that cleanup was a one-off (design D1), and record the backup prefix
- [x] 6.2 `docs/07-build-roadmap.md`: mark Phases 6 and 7 done
- [x] 6.3 `docs/03-data-model.md`: turn the "Changes from today" tables and the ApiKeys section into brief history; document the number rule (1–99 when present, required when active)
- [x] 6.4 Update the Obsidian vault notes covering the migration, the review area, the data model and the roadmap to match

## 7. Ship

- [ ] 7.1 Open a PR; the description states that the prod cleanup (section 1) has already run and must precede the merge
- [ ] 7.2 After merge: check how the website repo renders a player without `number` before the next real publish, then publish
- [ ] 7.3 Sync delta specs and archive the change
