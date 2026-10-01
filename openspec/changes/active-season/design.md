## Context

The website is a static SPA. It fetches the portal's published JSON from CloudFront (`DATA_BASE_URL` in `warriors-website/app/data/client.ts`). It has never been told which season is current, so it works one out:

- `SeasonLeaders.tsx` uses a constant, `CURRENT_SEASON = "25/26"`.
- `home.tsx` has the heading text `"2025/26 season"` written into it.
- `stats.tsx`, `team-stats.tsx` and `results.tsx` take the season list from `results.json` (newest first) and open on `seasons[0]`.
- `app/types/season.ts` is the closed union `"22/23" | "23/24" | "24/25" | "25/26"`.

In the portal, `lib/derived/season-order.ts` says explicitly that there is "no separate current-season concept". On prod, `Seasons` holds SSN2223 to SSN2526, and every one of them has games.

## Goals / Non-Goals

**Goals:**
- One admin-controlled switch in the portal decides the website's current season.
- A new season with no games shows on the website as soon as it is active and published.
- No prod migration, and website behaviour stays the same until the switch is first used.

**Non-Goals:**
- Automatic date-based rollover.
- A per-season "archived/locked" state.
- Showing season names anywhere in the portal beyond `/seasons`.
- Records and player-profile changes, since those pages are all-time.

## Decisions

### 1. `active?: boolean` on Season, resolved with a fallback
A season is active if it has `active: true`. If no season is flagged, the newest by `_id` is active. If somehow more than one is flagged, the highest flagged id wins. The pure function `resolveActiveSeason(seasons): Season | null` sits in `lib/derived/season-order.ts`, next to `sortSeasonsAscending`.

*Why:* the user chose this over a `Settings` singleton. The fallback means prod (no flags yet) publishes `activeSeason: "25/26"`, which is what the website shows today, so deploying this changes nothing until the admin acts. Because the resolver tolerates any number of flags, the "at most one" rule needs no database guarantee.

*Alternative rejected:* a partial unique index on `{active: 1}` where `active: true`. `ensureIndexes` only runs from the seed, so prod would need a one-off manual index create. A single local admin cannot race themselves, and the resolver is defined for the many-flags case anyway.

### 2. `setActiveSeason(id)`: set first, then clear the others
1. `findOne({_id: id})` → if it doesn't exist, throw `SeasonNotFoundError`.
2. `updateOne({_id: id}, {$set: {active: true, updatedAt: now}})`.
3. `updateMany({_id: {$ne: id}, active: true}, {$unset: {active: ""}, $set: {updatedAt: now}})`.

If the process dies between steps 2 and 3, two seasons are flagged and the newer one wins. That is usually the one just chosen, and running "Set active" again repairs it. The cleared flag is `$unset` rather than set to `false`, so documents look the same as never-flagged ones.

Bumping `updatedAt` makes the existing `getSeasonsLatestUpdatedAt` freshness check flag unpublished changes. The publish indicator needs no change.

### 3. `/seasons` page: an "Active" badge and a per-row "Set active" form
A new Status column shows a badge on the resolved active row. When no season is flagged, the badge also gets a "(default: newest)" hint, so it's clear nothing has been set yet. Every other row gets a small `<form action={setActiveSeasonAction}>` with a hidden `seasonId` and a secondary button. The server action calls the repository, runs `revalidatePath("/seasons")` and returns. There is no confirmation step, because it is trivially reversible.

### 4. `seasons.json` artifact
`generateSeasonsArtifact(seasons) → { activeSeason: string | null, seasons: string[] }` builds from `sortSeasonsAscending` and `resolveActiveSeason`, using names, not ids, because the website keys everything by name. It gets added to `GeneratedArtifacts` and `generateAllArtifacts`. `run.ts` and `cli.ts` already iterate the map, so they need no change. `SeasonsArtifactSchema` is added to `lib/publish/schemas.ts`. There is no golden fixture because the file is new, so it has a hand-written expected-shape test instead.

*Alternative rejected:* putting the field on `roster-config.json` or `team.json`. The user chose a dedicated file.

### 5. Website: one `getSeasons()` with a safe fallback
`client.ts` gains `getSeasons()`. If the fetch fails (for example, the website deploys before the portal publishes), it resolves to `null`, and callers fall back to today's behaviour (newest season with games). This keeps deploy order unimportant.

A small pure helper, `app/helpers/seasons.ts`, is unit tested and exposes two functions:
- `currentSeason(seasonsFile, results)` returns the season to use: `activeSeason`, or else the newest season in the results.
- `seasonOptions(seasonsFile, results)` returns the chip list, newest first: the union of `seasonsFile.seasons` and the seasons in the results, so a season with games but missing from the file is never hidden.

How each page uses them:
- **Home:** the loader adds `getSeasons()`. `SeasonLeaders` takes a `season` prop instead of the constant. The heading becomes `` `20${yy}/${yy2} season` `` built from the active name, e.g. "26/27" → "2026/27". When no player has stats for that season, it renders an empty state: "No games played yet this season."
- **Stats, Team Stats, Results:** the loader adds `getSeasons()`. The chips come from `seasonOptions`, and the default is `currentSeason`. The existing "All time"/"All" chips stay. With zero games each page already has empty states ("No results for this season." etc.); I'll check each one renders cleanly with zero games.
- **`app/types/season.ts`:** the type becomes `string`, and the union is removed. `data-helpers.ts`, `player.tsx` and `types.ts` keep compiling.

### 6. Website branch stacks on `website-s3-images`
Website PR #21 is still open and edits `client.ts` and the home loader. Branching `active-season` off it avoids a guaranteed conflict. If #21 merges first, it gets rebased onto `main`.

## Risks / Trade-offs

- **The admin forgets to set or publish 26/27**, so the website stays on 25/26. This is mitigated because the unpublished-changes indicator fires on the flag change. Creating 26/27 alone does not change the active season if a different season is already flagged. With no flags, the newest season wins, so simply creating 26/27 already makes it active by fallback. This is noted in the tasks' prod checklist.
- **The fallback hides the "nothing set" state.** The `/seasons` "(default: newest)" hint makes it visible.
- **Empty-season pages look bare** for the first weeks of a season. This is accepted, since the user explicitly wants the active season shown even with zero games, and the past-season chips are one click away.

## Migration Plan

No data migration. Deploy order doesn't matter (Decision 5). Prod steps after both PRs merge:
1. In the portal against prod: create season 26/27 and click "Set active" on it.
2. Publish, and check that `seasons.json` is on the CDN.
3. Deploy the website and check the home heading and the default season on each page.

Rollback: "Set active" on 25/26 and republish.

## Open Questions

None.
