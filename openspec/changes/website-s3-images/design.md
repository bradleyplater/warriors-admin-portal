## Context

Since `add-opponents` moved opponent logos into S3 (`opponents/<id>/logo-<ts>.<ext>`), `results.json` and `upcoming-games.json` carry each logo's key as `logoImage`. The CloudFront distribution `d20z7zill67968.cloudfront.net` serves the whole bucket except `backups/*`. The website already hard-codes that distribution as `DATA_BASE_URL` in `app/data/client.ts`.

The website currently builds crest URLs as `/images/team-logos/${logoImage}`, and falls back to a slug of the team name when `logoImage` is missing. If it is given an S3 key, it requests `/images/team-logos/opponents/...`, gets a 404, and shows initials. Fixtures come from a bundled JSON file that has to be edited by hand.

Prod check (2026-10-01): each of the 12 files in `public/images/team-logos/` belongs to an `Opponent` that already has an S3 logo:
- 10 tracked files, plus the untracked `Chargers.jpg` (Chelmsford Chargers).
- `altringham-jets-two.jpg` maps to Altrincham Jets Two.

19 opponents have no logo. Their slugs already miss, so they show initials either way.

## Goals / Non-Goals

**Goals:** the website takes crests and fixtures only from what the portal publishes, and the bundled duplicates are deleted.

**Non-Goals:**
- player photos
- sponsor, event and hero images
- awards
- new crest UI on the fixture cards
- image resizing or optimisation

## Decisions

- **The asset URL helper lives in the data client.** `assetUrl(key)` sits next to `DATA_BASE_URL`, because both the CDN host and the key format are publish concerns and this leaves one place to change the host.
  - `opponentCrestSrc` returns `string | null`. Null means the opponent has no logo, and callers render initials straight away.
  - Alternative: keep returning a string and rely on `onError`. Rejected because it wastes a request per logo-less opponent on every render.
- **Drop the slug fallback.** The portal is now the only source of logos, so a name-based guess against files that no longer exist can never succeed.
- **Fixtures load through `clientLoader`**, the same pattern every other artifact uses. `NextGameCard` gains an `upcomingGames` prop.
  - Alternative: fetch inside the component. Rejected because the loader already gates rendering behind `RouteLoadingFallback` and keeps components pure.
- **Keep the website's own date filtering.** The portal already drops past games. The site still keeps its "today onwards" filter, so a stale CDN copy can't show a game that has already been played.

## Risks / Trade-offs

- [Live artifacts don't carry logo keys yet] → Republish prod (`publish:run:prod`) alongside the website deploy. Crests show initials until both have happened. Republishing first is safe, because the old site already treats S3 keys as misses.
- [Cache staleness] → Logo keys are timestamped and immutable, so replacing a logo creates a new key and needs no invalidation. The JSON artifacts are invalidated by the publish.
- [Fixtures now depend on the CDN] → If the CDN is down, fixtures go down along with the stats. Accepted, because the rest of the site already depends on the CDN.

## Migration Plan

1. Republish prod from the portal. No data changes are involved. Check that `results.json` entries carry `logoImage` keys.
2. Merge and deploy the website (Cloudflare Pages).
3. Rollback: revert the website PR, which restores the deleted files.
