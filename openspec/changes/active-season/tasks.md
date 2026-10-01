## 1. Portal: schema and resolution

- [x] 1.1 Add optional `active: z.boolean().optional()` to `SeasonShape` in `lib/schemas/season.ts` (not in the create input)
- [x] 1.2 Unit tests: a season with `active: true` passes; `active: "yes"` fails on `active`
- [x] 1.3 Add `resolveActiveSeason(seasons)` to `lib/derived/season-order.ts` (the flagged season, highest id among flagged ones, else highest id overall, else null) and update the "no current-season concept" comment
- [x] 1.4 Unit tests: flagged wins over newer, none flagged gives newest, two flagged gives the higher one, empty list gives null

## 2. Portal: data access

- [x] 2.1 Add `SeasonNotFoundError` to `internal/errors.ts`, and `setActiveSeason(id)` to `lib/repositories/seasons.ts` (check it exists, `$set` the target, then `$unset` the others and bump their `updatedAt`); export both
- [x] 2.2 Integration tests: switching moves the flag and advances `updatedAt` on both changed seasons, and leaves untouched seasons' `updatedAt` alone; an unknown id throws and changes nothing; re-activating the active season is harmless

## 3. Portal: /seasons page

- [x] 3.1 Add a `setActiveSeasonAction(formData)` server action (calls the repository, `revalidatePath("/seasons")`)
- [x] 3.2 Seasons table: a Status column with an "Active" badge on the resolved season ("default: newest" hint when nothing is flagged) and a "Set active" button form on every other row
- [x] 3.3 E2E: in `e2e/` (new `active-season.spec.ts` or extend `create-season.spec.ts`), create a season, set it active, check that the badge moves and the publish bar shows unpublished changes

## 4. Portal: publish artifact

- [x] 4.1 Add `lib/publish/artifacts/seasons.ts` with `generateSeasonsArtifact(seasons)` returning `{ activeSeason, seasons }` by name, ascending; export it from the artifacts index
- [x] 4.2 Add `SeasonsArtifactSchema` to `lib/publish/schemas.ts` (`activeSeason: string | null`, `seasons: string[]`)
- [x] 4.3 Unit tests: the spec example (25/26 with games and 26/27 flagged with none gives `{ activeSeason: "26/27", seasons: ["25/26","26/27"] }`), the fallback when unflagged, no seasons gives `null`, and the output validates against the schema
- [x] 4.4 Add `"seasons.json"` to `GeneratedArtifacts` and `generateAllArtifacts`; update the generate, run and publish tests that count or list the artifacts (5 → 6)

## 5. Portal: seed and docs

- [x] 5.1 Mark the newest seeded season `active: true` in `seed/data/seasons.ts` (and its `seed/types.ts` type); update any seed tests that pin the season shape
- [x] 5.2 Update `docs/03-data-model.md` (Season `active`, resolution rule) and `docs/02-architecture.md` (the publish pipeline now generates 6 artifacts, including `seasons.json`)
- [x] 5.3 Update the Obsidian vault data-model / publish notes to match
- [x] 5.4 Run `npm run lint`, `typecheck`, unit, integration and e2e; open the portal PR

## 6. Website (`D:\Projects\warriors-website`, branch `active-season` off `website-s3-images`)

- [x] 6.1 `app/data/client.ts`: add `getSeasons()` (cached, resolves `null` on fetch failure); add a `SeasonsFile` type in `app/data/types.ts`
- [x] 6.2 Add `app/helpers/seasons.ts` with `currentSeason(file, results)`, `seasonOptions(file, results)` (newest first, union with the results' seasons) and `seasonHeading("26/27")` → `"2026/27 season"`, plus unit tests (including the `null`-file fallback and an active season with no games)
- [x] 6.3 Home: add `getSeasons()` to the loader; `SeasonLeaders` takes a `season` prop (delete `CURRENT_SEASON`) and shows "No games played yet this season." when empty; the heading uses `seasonHeading`
- [x] 6.4 Stats, Team Stats, Results: add `getSeasons()` to the loaders; build the chips from `seasonOptions` and default to `currentSeason`; check each page's zero-games empty state renders cleanly
- [x] 6.5 Replace the `Season` union in `app/types/season.ts` with `string`; fix any fallout in `data-helpers.ts`, `player.tsx` and `types.ts`
- [x] 6.6 Run the website's typecheck, tests and build; run it locally against a `seasons.json` with an empty 26/27 to eyeball the four pages; open the website PR

## 7. Prod rollout (manual, after both PRs merge)

- [ ] 7.1 Portal against prod: create season 26/27, click "Set active" on it, and publish; confirm `seasons.json` on the CDN shows `activeSeason: "26/27"`
- [ ] 7.2 Deploy the website; check the home heading reads "2026/27 season" and Stats, Team Stats and Results open on 26/27
- [ ] 7.3 Archive the change
