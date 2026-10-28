## Context

The website's game page already renders `GamePhotos`, a manual 16:9 carousel inside a 1120px container with `object-fit: scale-down`. Photos are letterboxed, never cropped. It takes `photos: { src, alt, caption? }[]` and shows placeholders when that array is empty. The portal has no photo data at all.

Constraints and precedent:
- The portal only runs locally on the admin's machine. It has a single user and no hosting request caps.
- Opponent crests (add-opponents) set the pattern for uploads. A server action uploads to S3 with a fresh key per upload. The document stores the bare S3 key. A read-through route serves previews. Compensating deletes clean up on failure, and IAM `DeleteObject` is scoped to a prefix.
- The website resolves S3 keys to CDN URLs with `assetUrl()` (website PRs #21 and #22 are merged).
- `sharp` 0.34.5 is already in `node_modules` as Next's optional image dependency.
- The admin's requirements: the admin uploads all photos (no photographer login); the portal resizes and compresses them for the website while keeping quality as high as possible; a game can have at most 6 photos.

## Goals / Non-Goals

**Goals:**
- Add, caption, reorder and delete up to 6 photos per game in the portal.
- Store photos sized and compressed for the carousel, at the highest quality that's practical.
- Publish the photos in `results.json` and have the website show them.

**Non-Goals:**
- Responsive variants, thumbnails, or `srcset` on the website.
- HEIC input, or cropping and editing photos.
- Deleting games. No UI exists for it.
- Bulk tools such as copying photos between games.

## Decisions

### D1. `Game.photos?: { key, alt?, caption? }[]`, max 6, with array order as display order
Embedding the photos in the game is natural: there are at most 6, they're never shared, and they're always read with the game. Order is just the array position, so there's no `order` field to keep consistent. `contentType` isn't stored, unlike opponent logos, because every stored photo is WebP (D2) and the schema checks that the key ends in `.webp`. The schema also checks that the key is under the game's own prefix. That catches a mixed-up key, which would otherwise publish another game's photo.

A separate `GamePhoto` collection was rejected. It adds a join and an ordering field for no benefit at this size.

### D2. Processing: sharp → fit inside 2400×1350, WebP quality 90, metadata stripped
`sharp(input, { limitInputPixels: 50_000_000 }).rotate().resize(2400, 1350, { fit: "inside", withoutEnlargement: true }).toColourspace("srgb").webp({ quality: 90, effort: 6, smartSubsample: true })`, with no `withMetadata()`.

**Size.** The carousel slot is at most 1120×630 CSS px, so 2240×1260 covers 2× (retina) screens. 2400×1350 is the next round 16:9 box above that. Fitting inside a 16:9 box (rather than setting a long-edge limit) gives portrait photos exactly the slot height they're shown at, so no pixels are wasted.

**Quality.** WebP q90 with `smartSubsample` is visually close to lossless for photos, yet still around 10× smaller than a phone JPEG. That puts a typical result at about 0.4–1 MB.

Two alternatives were rejected:
- AVIF compresses better, but encoding is slower and fine detail (jersey numbers, the ice surface) gets slightly soft at matching sizes.
- Keeping the original as well doubles storage. It also means storing location metadata we'd otherwise strip, for no use on the site.

**Metadata.** Stripping metadata is deliberate. Phone photos carry GPS locations, and these are public pages.

The type is decided by sharp decoding the file (`metadata().format` in `jpeg|png|webp`), not from the browser's MIME type. This is stricter than logos, and it's possible because every file is decoded anyway.

The exact numbers (2400×1350, q90) live as named constants in `lib/game-photos.ts`, so they're easy to tune after seeing real photos.

### D3. One server action call per file, with a 25 MB cap and `bodySizeLimit: "26mb"`
The add control accepts several files. A small client component loops over them, calling the upload action for each file in turn and showing per-file status.

Rejected alternatives:
- Posting all six photos in one request would need a body limit of about 150 MB and would hold six decoded images in memory at once.
- Presigned PUTs were rejected for the same reasons as in add-opponents D3: CORS, a confirm step, and orphaned uploads, all for a local-only tool.

The client also skips files beyond the remaining slots, so the admin gets an immediate message without a round trip. The server check (D4) is still the authority.

### D4. Upload order: validate → process → put → atomic push with limit
1. Check the size, then decode and process the photo (D2). Nothing has been written yet.
2. `PutObject` the processed image to `games/<gameId>/photos/<epochMillis>-<6 random hex>.webp`. The random suffix keeps two files processed in the same millisecond from colliding.
3. Run `updateOne({ _id, $expr: { $lt: [{ $size: { $ifNull: ["$photos", []] } }, 6] } }, { $push: { photos: { key } }, $set: { updatedAt } })`.
4. If step 3 matched nothing (the game is missing or full), delete the object quietly and return the matching error.

The limit is enforced atomically by the update filter, so a race can never produce a seventh photo. Writing the object before the document means the document never points at a missing file. At worst an orphaned object is left behind.

### D5. Edits by key, not index
`updatePhotoText(gameId, key, { alt, caption })` uses the positional `$` operator on `photos.key`.

`movePhoto(gameId, key, direction)` reads the array, swaps the two entries, and writes back with a filter on the previous array. If something else changed the array in the meantime, it re-reads once and retries. In practice that can only be another tab.

`removePhoto(gameId, key)` runs `$pull` and then deletes the object quietly (D6).

Identifying photos by key rather than position means a stale page can't edit or delete the wrong photo after a reorder.

Every one of these sets `updatedAt`, so the existing unpublished-changes indicator picks up photo changes without any extra work.

### D6. IAM: `s3:DeleteObject` on `games/*`
This is a new statement next to `DeleteOpponentLogos`. It is scoped so the credentials still can't delete publish artifacts or backups. It's `games/*` rather than `games/*/photos/*` because S3 policy wildcards inside a prefix are fine, but the narrower form buys nothing while `photos/` is the only thing under `games/`. The deny on `backups/` and the CDN config don't change.

### D7. Read-through preview route `app/games/[id]/photos/[name]/route.ts`
This mirrors the opponent logo route. It looks up the game, checks that `games/<id>/photos/<name>` is one of its photo keys (so the route can't be used to read arbitrary bucket objects), then streams the object as `image/webp` with `nosniff` and immutable private caching. Keys never change for the same content, so caching is safe. The portal shows these as fixed-size thumbnails with `object-fit: cover`.

### D8. Publish: `photos` in each `results.json` entry
`generateResultsArtifact` emits `photos: game.photos.map((p, i) => ({ key, alt: p.alt ?? generatedAlt(i), ...(p.caption && { caption }) }))`, and omits the field when there are none. That keeps the output for games without photos byte-identical, so their checksums don't change.

The generated alt follows the pattern `Photo 2 of 4 from Warriors v <opponent>, 12 Oct 2026`, with the date formatted in `Europe/London`. The opponent name comes from the opponent map that results generation already builds.

The key is published as `key`, not as a URL. This is the same reasoning as `logoImage`: the website already turns keys into CDN URLs with `assetUrl`.

### D9. Website mapping
In `routes/game.tsx`, the website calls `<GamePhotos photos={(game.photos ?? []).map(p => ({ src: assetUrl(p.key), alt: p.alt, caption: p.caption }))} />` and removes the placeholder comment. `GamePhotos` itself is unchanged: it already falls back to the caption or the alt text and keeps the placeholder for empty arrays. The note "Coming soon · club photographer" is still right for games without photos.

## Risks / Trade-offs

- **[iPhone HEIC photos]** These are rejected with a clear error. → The admin exports or shares the photos as JPEG. The error message says this. HEIC decoding would need a custom libvips build, which isn't worth it.
- **[Large uploads are slow]** A 20 MB photo takes a second or two to process with effort 6. → Each file shows its own status, and files upload one at a time.
- **[Mobile data use]** Each photo is about 0.5–1 MB at full size on phones. → Only the first slide loads eagerly, and the rest load lazily (the component already does this). A smaller variant can come later if it matters (see Open Questions).
- **[Whole-document writes elsewhere]** Every existing game write (`updateGame`, `addGoal`, and so on) reads, parses with `GameSchema`, then `replaceOne`s the document. Once `photos` is in the schema, those writes carry it through. However, a goal edit racing a photo upload in another tab could drop the new photo. → This is accepted for a single-user local tool. A regression test checks that an ordinary game edit preserves `photos`.
- **[Orphaned objects]** A crash between put and push, or a failed quiet delete, leaves a stray object. → This is accepted, as with opponent logos: it's harmless and rare.
- **[Publishing before the website change ships]** The website ignores unknown fields, so publishing early is harmless. Photos just won't appear until the website PR merges.
- **[The S3 emulator in tests]** Integration and e2e upload tests need Moto on :4566, the same as the opponent logo tests. Fixture images are generated with sharp inside the tests, so no binary fixtures need committing. The only exception is a small EXIF-rotated JPEG with GPS data, which is built in the test with `withMetadata({ orientation: 6, exif: … })`.

## Migration Plan

1. Merge the portal change with CI green. No data migration is needed.
2. Apply the Terraform IAM change to prod.
3. Upload photos to a real game through the local portal against prod, then publish. Check `results.json` on the CDN.
4. Merge the website PR and check the game page.

**Rollback:** revert the portal commit. Nothing crashes, because the old `GameSchema` strips the unknown `photos` field on read (Zod's default object behaviour). However, every game repository write reads, parses, then `replaceOne`s the whole document, so the first edit of a game under the old code silently drops its `photos`. The S3 objects remain and could be re-attached by hand. The website ignores the field if it's reverted.

## Open Questions

- Is one 2400×1350 variant enough for phones, or should we later add a ~1200px variant and `srcset`? Deferred until real photos are live and we can see the page weight.
