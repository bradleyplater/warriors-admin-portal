## 1. Schemas

- [x] 1.1 Add `lib/schemas/opponent.ts`: `OpponentSchema` (`OPN` + 6 digits, trimmed non-empty name, optional `logo { key, contentType }` with allowlisted MIME types and a key-extension/content-type cross-check), a create-input variant, and a MIME → extension helper; export from `lib/schemas/index.ts`
- [x] 1.2 Unit tests for the opponent schema: with and without a logo, bad content type, extension mismatch, bad id, blank name
- [x] 1.3 Change `Game.opponentTeam` in `lib/schemas/game.ts` from `name` to `opponentId` (`OPN` format) in both stored and create-input schemas; update `game.test.ts` fixtures and add the id scenarios

## 2. Data access

- [x] 2.1 Add the `opponent: "Opponent"` collection name, a unique case-insensitive `name` index on opponents, and an `opponentTeam.opponentId` index on games in `lib/repositories/internal/`
- [x] 2.2 Add `lib/repositories/opponents.ts` (id generation exposed for upload-before-insert, create with collision retry, getById, listSortedByName, update name/logo, delete, typed duplicate-name error); register it in `lib/repositories/index.ts`
- [x] 2.3 Add `countByOpponentId` to the games repository and update any game read/write code that referenced `opponentTeam.name`
- [x] 2.4 Integration tests: OPN id format and retry, case-insensitive duplicate name → typed error, list ordering, count by opponent

## 3. Logo storage

- [x] 3.1 Add an opponent-logo storage module (build key `opponents/<id>/logo-<ms>.<ext>`, `PutObject` with Content-Type, `DeleteObject`) using `getS3Client()`/`S3_BUCKET`
- [x] 3.2 Add upload validation (allowlisted MIME, ≤ 5 MB, extension derived from MIME) with unit tests
- [x] 3.3 Set `experimental.serverActions.bodySizeLimit: "6mb"` (or the Next 16 equivalent) in `next.config.ts`
- [ ] 3.4 Add `s3:DeleteObject` scoped to `opponents/*` to `infra/terraform/iam.tf` and run `terraform plan` (apply in task 9.1)

## 4. Opponent service and pages

- [x] 4.1 Opponent service: create (validate → uniqueness pre-check → upload → insert, deleting the upload on insert failure), update (rename and/or replace logo: new key, update doc, then delete old object), delete (block if referenced, with the count; otherwise delete doc then logo)
- [x] 4.2 Integration tests for the service against Mongo and Moto: create with/without logo, replace deletes the old object, blocked delete leaves doc and logo, unreferenced delete removes both, upload cleaned up on duplicate-name failure
- [x] 4.3 `/opponents` list page (per-request, sorted, logo or "No logo" placeholder, rows link to edit, "Add opponent" link)
- [x] 4.4 `/opponents/new` form (name + optional file) with server action and field-level errors
- [x] 4.5 `/opponents/[id]/edit` form (rename, current logo preview, replace logo, delete with blocked-reason message; 404 on unknown id)
- [x] 4.6 Serve logo previews in the portal from S3 (CDN URL in prod, emulator URL locally, or a small read-through route), consistent with how player images are displayed
- [x] 4.7 Add Opponents to the shell navigation in `app/layout.tsx`

## 5. Games use the opponent reference

- [x] 5.1 Replace the free-text opponent field in `GameForm.tsx` with a picker of opponents sorted by name; update `form-parsing.ts` (+ tests) to produce `opponentId`
- [x] 5.2 Load opponents in `/games/new` and `/games/[id]/edit`; check the opponent exists in the create/edit server actions (field error if not)
- [x] 5.3 Resolve opponent names via an id → opponent map on `/games` (`GamesTable`), `/games/[id]`, and anywhere else that showed `opponentTeam.name` (e.g. player profile); update the affected page tests

## 6. Publish enrichment

- [x] 6.1 Load opponents in `lib/publish/generate.ts` and pass a map to the results generator; emit `opponentTeam` from the opponent name and `logoImage` from `logo.key` when present; throw on a dangling reference naming the game
- [x] 6.2 Update `lib/publish/schemas.ts`'s `logoImage` comment and the results/team artifact tests (with logo, without logo, rename changes the checksum, dangling reference throws)

## 7. Seed data and E2E

- [x] 7.1 Add seeded opponents (with logo, without logo, one unreferenced), point every seeded game at one, add `opponents` to the seed/reset collection set and the empty-check; update `seed/fixtures.test.ts`
- [x] 7.2 Update the existing e2e specs that type an opponent name (create-game, edit-game, etc.) to use the picker
- [x] 7.3 New `e2e/opponents.spec.ts`: create with logo, rename shows on a game, replace logo, blocked delete, delete unreferenced, nav link
- [x] 7.4 Run lint, typecheck, unit, integration, and full e2e locally; confirm CI is green

## 8. Backfill migration (one step)

- [x] 8.1 Pull `distinct("opponentTeam.name")` with game counts from prod (read-only) and agree each raw name → canonical name with the user one at a time; commit `lib/migration/opponents/mapping.json`
- [x] 8.2 Implement `lib/migration/opponents/run.ts` + `run-cli.ts`: dry-run by default (fail on any unmapped raw name, warn on unused mapping entries, report opponents to create and games per opponent); `--apply` upserts opponents, swaps `name` → `opponentId` per raw name, then verifies no game still has `name`/lacks `opponentId` and every game passes `GameSchema`; idempotent on re-run; add an npm script run through `scripts/with-env.mjs`
- [x] 8.3 Integration tests for the migration: dry-run writes nothing, unmapped name blocks apply, apply maps variants to one opponent, re-run is a no-op, reuses an existing same-named opponent

## 9. Production rollout

- [ ] 9.1 Apply the Terraform IAM change to prod
- [ ] 9.2 Take a prod backup with the existing backup CLI and record its prefix
- [ ] 9.3 Run the migration dry-run against prod and review the output with the user; it must be clean
- [ ] 9.4 Run `--apply` against prod (only with this branch's code as the running portal) and record the counts
- [ ] 9.5 Smoke-test against prod: `/games`, a game detail, `/opponents`, one logo upload, publish generation without upload

## 10. Docs and cleanup

- [x] 10.1 Update `docs/03-data-model.md` (Opponent entity, `Game.opponentTeam.opponentId`, logo key layout) and the Obsidian vault data-model note
- [ ] 10.2 Record the migration run (backup prefix, counts) in the docs/vault
- [ ] 10.3 After the prod run, remove `lib/migration/opponents/` and its npm script in a follow-up commit
