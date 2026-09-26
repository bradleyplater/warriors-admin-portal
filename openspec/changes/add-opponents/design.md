## Context

`Game.opponentTeam.name` is free text entered on each game. Prod has about 30 distinct values, several of them typos or variants of the same club (the golden fixture shows "Clevland Comets" ×3 alongside "Cleveland Comets" ×1, and "Altringham Jets" / "Jets One" / "Jets Two"). No opponent logo is stored anywhere. KAN-30 therefore ships `results.json` without `logoImage`, even though every legacy entry had one (a bare filename like `clevland-comets.jpg` that the website resolved locally).

Constraints that shape this design:
- The portal only ever runs locally on the admin's machine. There is no hosting platform request cap and no multi-user concurrency.
- Existing S3 usage: one bucket (`S3_BUCKET`), with publish artifacts at the root and `backups/` (denied at the CDN), served through CloudFront. The app IAM user has `GetObject`/`PutObject` on `bucket/*` only.
- Prod collections are capitalised and singular (`Player`, `Game`, `Team`, `Seasons`). The new collection follows suit as `Opponent`.
- Precedent: `Player.imagePath` stores a bare S3 key, not a URL, so documents stay portable across environments.
- The migration review UI was removed deliberately in PR #35 and must not return. The mapping is agreed in conversation instead.

## Goals / Non-Goals

**Goals:**
- Opponent as a first-class, referenced entity with an optional logo stored in S3.
- Canonicalise the existing free-text names in one migration step.
- `results.json` is enriched at publish time with the current name and logo key.

**Non-Goals:**
- Website changes to consume `logoImage` as an S3 key (the user's follow-up).
- Importing legacy logo files (uploaded by hand afterwards).
- Opponent players as entities: opponent goal scorers and penalty offenders stay free text.
- Any mapping-review UI.

## Decisions

### D1. `Opponent { _id: "OPN######", name, logo?: { key, contentType }, createdAt, updatedAt }`
The prefix is `OPN` because `OPP` is already taken by embedded opponent penalty ids. `logo` is optional because logos are uploaded by hand after the migration.

**Key and file type.** The website needs to know the resource's type. The key carries it (`…/logo-<ts>.svg`), and S3 returns it as the `Content-Type` header set at upload. `contentType` (MIME) is stored as well. It is what uploads are validated against, it is what `PutObject` is given, and the schema cross-checks it against the key's extension so the two can't drift apart. A separate `fileType: "svg"` field was rejected because it would repeat the end of the key.

### D2. Key layout `opponents/<opponentId>/logo-<epochMillis>.<ext>`, fresh key per upload
Replacing a logo writes a new key and then deletes the old object only after the DB update succeeds. This means the CDN never needs invalidating, and a failure part-way leaves at worst an orphaned object, never a document pointing at a missing file. Overwriting a stable key was rejected because it needs a CloudFront invalidation per change and exposes a stale-cache window.

The extension comes from the validated MIME type (`svg|png|jpg|webp`), never from the uploaded filename.

### D3. Upload through a server action with `serverActions.bodySizeLimit: "6mb"`, plus a 5 MB app-level cap
Because the portal only runs locally, the only reason for presigned PUTs (hosting request caps) doesn't apply. A single server action keeps validation server-side, needs no bucket CORS rule, and avoids a three-step upload/confirm flow with abandoned-upload orphans. The Next limit is set slightly above the app cap so oversize files get the app's field-level error, not a framework error.

Presigned PUT was rejected: it needs CORS in Terraform, a confirm step, and orphan handling, all for a local-only tool.

### D4. Create order: validate → insert → upload → record logo
Everything (name, file type and size) is validated before anything is written. The opponent document is then inserted (which is where the unique index rejects a duplicate name), and only then is the logo uploaded under the new id and recorded on the document. A duplicate name therefore never writes to S3. If the upload or the follow-up update fails, the service deletes the uploaded object (if any) and the new document, then rethrows.

This replaces the original "generate id → upload → insert" plan, which would have needed id generation exposed outside the repository, plus a way to re-key an already-uploaded logo when an `_id` collision forced a retry.

### D5. Name uniqueness via a case-insensitive unique index
A unique index on `name` with collation `{ locale: "en", strength: 2 }`, surfaced as a typed error, following the same pattern as the duplicate shirt-number error. This keeps "Cleveland Comets" from coming back as a near-duplicate later. Names are trimmed before storage.

### D6. Game references only; names resolved at read time
`opponentTeam` becomes `{ opponentId, goals, penalties }` with no stored name snapshot. A rename (such as fixing a typo) should correct history, and a club rebrand is rare enough to model as a new opponent if it's ever wanted.

Pages that show games load opponents once (the collection is small, around 30 documents) and build an id → opponent map, rather than using `$lookup`. This keeps repositories simple and mirrors how players are resolved for display.

Existence of the referenced opponent is checked in the game server actions, not the Zod schema (it needs the DB), in line with the existing roster-player existence checks.

### D7. Blocked delete uses a live count
The service counts games with `opponentTeam.opponentId = id` (indexed). If the count is greater than zero, deletion is refused with the count. Otherwise it deletes the document and then the logo object. A soft-delete or `active` flag was rejected as unnecessary: an opponent nobody references can simply go.

### D8. Publish enrichment in `lib/publish/artifacts/results.ts`
`generate.ts` loads opponents alongside games and passes an id → opponent map into the results generator. The generator emits `opponentTeam: opponent.name` and `logoImage: opponent.logo?.key` (omitted when absent). A missing opponent throws, naming the game, rather than publishing a partial entry. The existing `ResultArtifactSchema` already has `logoImage` optional, so only its "not generated" comment changes. Because checksums are content-based, renames and logo changes are picked up automatically as changed artifacts. The publish status indicator also counts the Opponent collection's latest `updatedAt` (it has its own `{ updatedAt: -1 }` index), so a rename shows as an unpublished change just like a game edit.

Logo previews inside the portal go through a small read-through route (`/opponents/[id]/logo`) that streams the object with its stored content type, plus a restrictive CSP and `nosniff`. This works the same against the local emulator and the real bucket, with no CDN URL to configure. Player images have no display precedent to follow.

### D9. IAM gains `s3:DeleteObject` on `opponents/*` only
This is the minimum needed for D2 and D7 cleanup, scoped so the app still can't delete publish artifacts or backups. The CloudFront distribution already serves every path except `backups/`, so no CDN change is needed.

### D10. One-step migration under `lib/migration/opponents/`, driven by a committed mapping
- `mapping.json`: a list of `{ canonicalName, rawNames: [...] }` entries, built with the user one name at a time from `distinct("opponentTeam.name")` on prod.
- **Dry-run** (the default) reports: raw names with no mapping (a hard failure), mapping entries matching no game (a warning), the opponents to be created, and the game count per opponent. It writes nothing.
- **Apply** is idempotent on re-run:
  1. Upsert one `Opponent` per canonical name, reusing an existing opponent with that name.
  2. For each raw name, run `updateMany({ "opponentTeam.name": raw }, { $set: { "opponentTeam.opponentId": id }, $unset: { "opponentTeam.name": "" } })`.
  3. Verify that zero games still have `opponentTeam.name` or lack `opponentId`, and that every game passes `GameSchema`.
- Runs through `scripts/with-env.mjs`, requires an explicit `--apply`, and is preceded by a backup (the existing backup CLI).
- It is one step, not additive-then-cleanup, because nothing else reads the data while it runs (the portal is local-only). The backup is the rollback.
- The script and mapping are deleted in a follow-up commit or PR once prod has been migrated, matching the decommission-migration precedent. The run is recorded in the vault/docs.

## Risks / Trade-offs

- **[Unmapped name on prod]** A game with an unmapped name would be left with `name` and no `opponentId`, which fails the new schema. → Dry-run fails hard on any unmapped raw name, and apply refuses to run unless the dry-run is clean.
- **[Old code against migrated data]** If the pre-change code runs against migrated prod, game pages crash (no `name`). → Migrate only once this branch is what's being run locally. The runbook task says so explicitly.
- **[SVG content]** SVGs can contain script. → Logos are shown through `<img>` (scripts don't execute there), both in the portal and presumably on the website, and are served from the CDN domain, not the portal's origin. Content-Type is taken from the validated allowlist, never trusted from the client.
- **[Orphaned S3 objects]** A crash between upload and insert, or between update and old-object delete, leaves a stray object. → Accepted: harmless and rare. Compensating deletes cover the common failure paths.
- **[Website shape change]** `logoImage` changes from a bare legacy filename to an S3 key. → Publishing with this change before the website follow-up ships would break logos on the site (they're currently absent from our output anyway). Hold publishing until the website is ready, or accept no logos in the meantime. This is flagged to the user rather than solved here.
- **[Local MinIO/Moto]** The e2e and integration suites need the S3 emulator (Moto on :4566) for upload tests. → Reuse the existing publish-test S3 setup.

## Migration Plan

1. Merge the code (schemas, repos, pages, publish, seed) on this branch, with CI green against seed data.
2. Apply the Terraform IAM change (`s3:DeleteObject` on `opponents/*`).
3. Pull the distinct prod opponent names (read-only) and agree the mapping with the user one name at a time. Commit `mapping.json`.
4. Take a prod backup, then dry-run (it must be clean), then apply against prod. Verify the counts.
5. Smoke-test the local portal against prod: games list/detail, the opponents page, and a publish dry run.
6. Upload logos by hand through `/opponents`.
7. Follow-up: remove the migration script and mapping. The website change is the user's.

**Rollback:** restore the pre-migration backup with the existing restore CLI and run the previous commit.

## Open Questions

- Should publishing be held back until the website follow-up can read `logoImage` as a key? This is the user's call, and isn't blocking for this change.
