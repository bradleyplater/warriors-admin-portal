## Why

It is now 1 October 2026, so the 26/27 season has started, but the website still shows 25/26 everywhere. Nothing in either system records which season is current. The portal only sorts seasons by id. The website hardcodes `"25/26"` on the home page, and its Stats, Team Stats and Results pages open on "the newest season that has games", so they keep showing last season until the first new game is played. The admin needs one switch in the portal that decides the website's current season.

## What Changes

- `Season` gains an optional `active` boolean. At most one season is active at a time.
- The `/seasons` page shows which season is active and has a **Set active** action on every other season. Setting a season active clears the flag on the previous one and bumps `updatedAt`, so the existing unpublished-changes indicator lights up.
- **Resolution rule:** the active season is the season flagged `active`. If none is flagged, it is the newest season by id. Today's behaviour is preserved until the admin first sets one, so prod needs no backfill.
- Publish generates a sixth artifact, `seasons.json`: `{ activeSeason: "26/27", seasons: ["22/23", …, "26/27"] }`. Seasons are listed by name in ascending order and include seasons with no games yet.
- Seed data marks one season active.
- **Website (sibling repo `warriors-website`):**
  - It fetches `seasons.json` from the CDN.
  - Home "Season leaders" and its heading use the active season, with an empty state when no games have been played yet.
  - Stats, Team Stats and Results open on the active season, even with zero games, and show their empty state. The season chips still let visitors browse earlier seasons. The chip list comes from `seasons.json`, so a new season appears before its first game.
  - The hardcoded `CURRENT_SEASON` constant, the `"2025/26 season"` heading and the closed `Season` type union are removed.

Out of scope:
- Automatically switching season by date. The admin decides.
- Changing hero-slide photo captions.
- Player profile and Records pages, which are already all-time views.
- Creating 26/27 in prod. That is a manual step through the portal after deploy (see tasks).

## Capabilities

### New Capabilities
- `active-season`: marking a season active in the portal, the resolution rule (flag, else newest), and generating `seasons.json` at publish time.

### Modified Capabilities
- `entity-schemas`: the Season schema accepts an optional `active` boolean.

## Impact

- **Portal code:**
  - `lib/schemas/season.ts`
  - `lib/repositories/seasons.ts` (new `setActiveSeason`)
  - `lib/derived/season-order.ts` (new `resolveActiveSeason`)
  - `app/seasons/` (page and action)
  - `lib/publish/` (`generate.ts`, new `artifacts/seasons.ts`, `schemas.ts`)
  - `seed/data/seasons.ts`
- **Data:** no migration. Existing prod seasons have no `active` field and fall back to newest-by-id. There is no new index, so prod needs no one-off steps beyond using the UI (see design for why).
- **S3:** one new published object, `seasons.json`, at the bucket root. There are no IAM or CDN changes.
- **Website:** `app/data/client.ts`, `app/components/SeasonLeaders/`, and `app/routes/` (`home`, `stats`, `team-stats`, `results`, `player`, which uses the `Season` type) plus `app/types/season.ts` and `app/helpers/data-helpers.ts`. This stacks on the open `website-s3-images` branch (website PR #21), because both touch `client.ts` and the home loader.
- **Docs:**
  - `docs/03-data-model.md` (Season `active`)
  - `docs/02-architecture.md` (publish: 6 artifacts)
  - the Obsidian vault data-model note
