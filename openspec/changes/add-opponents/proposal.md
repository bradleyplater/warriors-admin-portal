## Why

Opponents are currently a free-text `opponentTeam.name` typed on every game. Prod data has picked up typos and variants as a result (e.g. "Clevland Comets" vs "Cleveland Comets"), and there is nowhere to store an opponent's logo. That is why `results.json` has not emitted `logoImage` since KAN-30. Making opponents a managed entity with a logo in S3 fixes both problems and gives the website what it needs.

## What Changes

- New `Opponent` entity (`OPN` + 6-digit id) storing a `name` and an optional `logo: { key, contentType }`. The logo file lives in `S3_BUCKET` under `opponents/<id>/logo-<timestamp>.<ext>`, and the database stores only the key and MIME type.
- New Opponents area (`/opponents`): list, create, edit name, upload or replace logo. Each upload gets a fresh key, so no CDN invalidation is needed, and the replaced object is deleted. Uploads go through a server action with a raised body size limit. The portal only ever runs locally, so no presigned URLs are needed.
- Deleting an opponent is blocked while any game references it.
- **BREAKING** `Game.opponentTeam.name` is replaced by `Game.opponentTeam.opponentId`, a reference to an existing opponent. The create/edit game forms swap the free-text field for a picker of existing opponents. Opponents can only be created from the Opponents page.
- Game list and detail pages resolve the opponent's name through the reference.
- Publish enriches `results.json` at generation time: `opponentTeam` becomes the referenced opponent's current name, and `logoImage` is the logo's S3 key when one exists (otherwise omitted). No opponents artifact is published.
- A one-off backfill migration moves prod data in a single step (backup → dry-run → apply). It creates one `Opponent` per canonical name and swaps each game's `name` for `opponentId`. It is driven by a committed mapping file of raw name → canonical name, agreed with the user name by name. The script is removed after it has run, following the decommission-migration precedent.
- Seed data gains opponents, and seeded games reference them.

Out of scope: website repo changes to consume `logoImage` as an S3 key (the user's follow-up), importing the legacy website `.jpg` logos (they will be uploaded by hand), and any review UI for the mapping.

## Capabilities

### New Capabilities
- `opponent-management`: Opponent schema and repository, the `/opponents` pages, logo upload/replace/storage in S3, blocked deletion of referenced opponents, and `results.json` enrichment from opponent data at publish time.

### Modified Capabilities
- `entity-schemas`: `Game.opponentTeam` carries `opponentId` instead of `name`.
- `game-management`: create/edit forms pick an existing opponent instead of typing a name; list and detail pages show the referenced opponent's name.
- `data-access-layer`: `OPN` joins the collision-safe top-level id scheme for the new opponents collection.
- `seed-data`: seed includes opponents, and every seeded game references one.
- `portal-shell`: shell navigation includes an Opponents link.

## Impact

- **Code**: `lib/schemas/` (new `opponent.ts`, `game.ts`), `lib/repositories/` (new `opponents.ts`, `collections.ts`, `indexes.ts`, `games.ts`), `app/opponents/` (new), `app/games/` (form, parsing, actions, list, detail), `lib/publish/artifacts/results.ts`, `app/layout.tsx` nav, `seed/`, `next.config.ts` (`serverActions.bodySizeLimit`), plus a temporary `lib/migration/opponents/` backfill.
- **Data**: new `Opponent` collection in prod, and every prod `Game` document is rewritten (`opponentTeam.name` → `opponentTeam.opponentId`). A backup is taken first.
- **S3**: new `opponents/` prefix in the existing bucket, served through the existing CloudFront distribution. The app IAM policy (`infra/terraform/iam.tf`) currently grants only `GetObject`/`PutObject`, so it needs `s3:DeleteObject` (scoped to `opponents/*`) for replaced logos to be removed. That is a small Terraform change, applied to prod.
- **Published output**: `results.json` gains `logoImage` (an S3 key, not the legacy bare filename) and canonicalised opponent names. The website must be updated to match (follow-up).
- **Docs**: `docs/03-data-model.md` and the Obsidian vault data-model note.
