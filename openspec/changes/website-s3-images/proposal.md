## Why

The portal now stores opponent logos in S3 and publishes each one's key as `logoImage` in `results.json` and `upcoming-games.json`. The website (`warriors-website`, the sibling repo) still loads crests from its own `public/images/team-logos/` folder, guessing a filename from the team name. It also reads fixtures from a bundled `public/data/upcoming-games.json` rather than the copy the portal publishes. As a result, logo changes made in the portal never reach the site, and the bundled crests are a second copy that drifts.

## What Changes

- The website resolves an opponent crest as `<CDN base URL>/<logoImage>` (the published S3 key). When `logoImage` is missing or empty it shows the existing initials fallback. The team-name slug guess against local files is removed.
- The website fetches `upcoming-games.json` from the CDN through its data client, alongside `players.json`, `results.json` and `roster-config.json`. The home page and `/schedule` load it in their `clientLoader`s instead of importing the bundled file.
- **BREAKING (website)**: `public/images/team-logos/` is deleted. That is all 12 files, including the untracked `Chargers.jpg`. Every one of them has an S3 logo on its prod `Opponent`, so nothing visible is lost. `public/data/upcoming-games.json` is also deleted.
- Prod `results.json` and `upcoming-games.json` are republished so the live artifacts carry the logo keys. Today, live `results.json` has no `logoImage` at all. Live `upcoming-games.json` has `""` for Chelmsford Chargers, even though that opponent now has a logo.

Out of scope:
- player photos (`public/images/players/`, which the portal has no S3 upload for)
- sponsor, event, hero and club-logo images
- `awards.json`
- adding crests to the fixture cards, which don't render one today

## Capabilities

### New Capabilities
- `website-published-assets`: how the public website consumes portal-published data and S3-hosted images from the CDN (opponent crests and upcoming fixtures).

### Modified Capabilities
None. The portal's publish output is unchanged.

## Impact

- **warriors-website**:
  - `app/data/client.ts` (and its test) gains `getUpcomingGames` and an asset URL helper.
  - `LatestResultCard` (`opponentCrestSrc`) and `routes/game.tsx` use the CDN URL.
  - `routes/home.tsx`, `NextGameCard` and `routes/schedule.tsx` take fixtures from the loader.
  - `public/images/team-logos/*` and `public/data/upcoming-games.json` are deleted.
  - No header changes are needed: the CSP already allows `img-src https:`, and `connect-src` already allows the CDN.
- **warriors-admin-portal**: no code changes. This change's artifacts live here, and the docs record that the website now consumes S3 logos.
- **Prod**: one `publish:run:prod` run, with no data changes.
