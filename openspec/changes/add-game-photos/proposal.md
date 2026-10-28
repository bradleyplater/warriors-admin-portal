## Why

Each game page on the website has a "Photos from the game" carousel (`GamePhotos`), but it only shows placeholder slides. Nothing in the portal stores game photos and nothing is published for them. The admin wants to upload up to 6 photos per game in the portal and have them appear on that game's page after the next publish.

## What Changes

- `Game` gains an optional `photos` array, with at most 6 entries. Each entry is `{ key, alt?, caption? }`, and the array order is the display order.
- The game detail page (`/games/[id]`) gets a **Photos** section where the admin can:
  - add photos (selecting several at once is fine, up to the 6-photo limit)
  - edit each photo's alt text and caption
  - move photos earlier or later
  - delete a photo
- On upload, the portal processes each photo for the website before storing it:
  - it applies the EXIF rotation, then strips all metadata (including GPS location)
  - it converts the colours to sRGB
  - it scales the photo down to fit 2400×1350 without cropping or enlarging
  - it encodes it as high-quality WebP
- The admin uploads all photos. There is no separate photographer login.
- Processed photos are stored in S3 under `games/<gameId>/photos/`, with a fresh key per upload, and are served through the existing CDN.
- `results.json` gains an optional `photos` array per game, `[{ key, alt, caption? }]`, omitted when a game has none. When a photo has no alt text, publish generates one from the game (for example "Photo 2 of 4 from Warriors v Cleveland Comets, 12 Oct 2026").
- Terraform IAM gains `s3:DeleteObject` on `games/*`, so deleting a photo removes its S3 object.
- **Website (sibling repo `warriors-website`):** the `Result` type gains `photos`. `routes/game.tsx` passes them into `<GamePhotos photos={…} />`, with each key resolved through the existing `assetUrl` helper. Games without photos keep the current placeholder.

Out of scope:
- Separate logins or roles for a club photographer.
- Responsive variants (`srcset`) or thumbnails for the website. One processed size is published (see the design's open questions).
- HEIC input. iPhone photos must be JPEG, which is the "Most Compatible" camera setting or what the iPhone produces when you share a photo out.
- Cropping or editing photos in the portal.
- Deleting games. There is no UI for it today. If it is added later, it must remove that game's photos too.

## Capabilities

### New Capabilities
- `game-photos`: uploading, processing, ordering, captioning and deleting a game's photos in the portal, the 6-photo limit, S3 storage, and publishing the photos in `results.json`.

### Modified Capabilities
- `entity-schemas`: the Game schema accepts an optional `photos` array (at most 6 entries, each with a WebP key under `games/<gameId>/photos/`).

## Impact

- **Portal code:**
  - `lib/schemas/game.ts` (the photo shape and the 6-photo limit)
  - `lib/repositories/games.ts` (add, update, reorder and remove a photo)
  - new `lib/game-photos.ts` (sharp processing and S3 put/delete/read), modelled on `lib/opponent-logos.ts`
  - new `app/games/[id]/photos/` (server actions and a read-through preview route)
  - `app/games/[id]/page.tsx` (the Photos section)
  - `lib/publish/artifacts/results.ts` and `lib/publish/schemas.ts`
- **Dependencies:** `sharp` becomes a direct dependency. It is already installed as Next's optional image dependency (0.34.5).
- **Config:** `serverActions.bodySizeLimit` rises from `6mb` to `26mb`, because photos are uploaded one per request with a 25 MB per-file cap.
- **Data:** no migration. Existing games have no `photos` field.
- **Infra:** one IAM statement in `infra/terraform/iam.tf`, applied to prod. No CDN change is needed, because the distribution already serves everything except `backups/`.
- **Website:** `app/data/types.ts` (`Result.photos`) and `app/routes/game.tsx`.
- **Docs:**
  - `docs/03-data-model.md` (Game `photos`)
  - the `results.json` fixture README
  - the Obsidian vault data-model note
