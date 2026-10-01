## 1. Schema

- [x] 1.1 Add `lib/schemas/upcoming-game.ts`: `UpcomingGameSchema` (`UPG` + 6 digits, `opponentId` in OPN format, real-calendar `YYYY-MM-DD` date, `HH:mm` 24h time, `location` HOME/AWAY, `type` narrowed to CHALLENGE/LLIHC/BOTBC via `GameTypeSchema.extract`, trimmed `venue` required when AWAY and absent when HOME), a create-input variant, and an `UPCOMING_GAME_ID_PATTERN`; export from `lib/schemas/index.ts`
- [x] 1.2 Unit tests: valid home and away games, away missing or blank venue, home with venue, bad date (`2026-02-30`), bad time (`25:00`), NIHC rejected, malformed id

## 2. Data access

- [x] 2.1 Add `upcomingGame: "UpcomingGame"` to `internal/collections.ts`, and add `{ date: 1, time: 1 }`, `{ opponentId: 1 }`, and `{ updatedAt: -1 }` indexes in `internal/indexes.ts`
- [x] 2.2 Add `lib/repositories/upcoming-games.ts` (create with UPG id retry, get, list sorted by date/time, full-replace update, delete with NotFound, count by opponent, latest `updatedAt`); register it in `lib/repositories/index.ts`
- [x] 2.3 Integration tests: id format, list ordering, update Away→Home drops `venue` and advances `updatedAt`, delete/NotFound, count by opponent

## 3. Shared publish helpers

- [x] 3.1 Extract `competitionLabel` from `lib/publish/artifacts/results.ts` into a shared module (results keeps its behaviour and tests)
- [x] 3.2 Add `todayInLondon(now)` and a `formatTime12h("HH:mm")` helper, with unit tests (BST/GMT day boundary around midnight UTC; `00:15` → `12:15 AM`, `12:00` → `12:00 PM`, `20:30` → `8:30 PM`)

## 4. Publish artifact

- [x] 4.1 Add `lib/publish/artifacts/upcoming-games.ts`: filter `date >= today`, sort by date then time, map `opponentTeam`/`logoImage` (`""` when no logo)/`gameType`/`date`/`time`/`location` (`HOME_VENUE` constant or venue), and throw on a missing opponent naming the game
- [x] 4.2 Unit tests covering the spec scenarios: Chelmsford away example output, home with logo, past excluded, ordering, missing opponent throws
- [x] 4.3 Add `UpcomingGameArtifactSchema` to `lib/publish/schemas.ts` (`gameType: z.string()`); validate it against `fixtures/golden/upcoming-games.json` in the golden-fixture test and against generated output; update the "not covered" comment
- [x] 4.4 Add `upcomingGames` and `today` to `generateAllArtifacts`; load `listUpcomingGames()` in `run.ts` and `cli.ts`; update the `GeneratedArtifacts` type and any generate/run tests
- [x] 4.5 Add `getUpcomingGamesLatestUpdatedAt()` to `getPublishStatus`; add a status test

## 5. Opponent delete guard

- [x] 5.1 Make `lib/opponents/service.ts` delete also count upcoming games, and refuse with a message reporting games and/or upcoming games
- [x] 5.2 Integration test: an opponent referenced only by an upcoming game cannot be deleted, and its doc and logo remain

## 6. Pages

- [x] 6.1 `/upcoming-games` list page (dynamic, Upcoming and Past sections split by `todayInLondon`, opponent names from one `listOpponents()` map, rows link to edit, empty state, "Add upcoming game" link)
- [x] 6.2 `UpcomingGameForm.tsx` (opponent select, date, time, Home/Away radio, venue shown only when Away, competition select; field errors; values kept on error) and a form-parsing helper with unit tests (venue discarded for HOME)
- [x] 6.3 `/upcoming-games/new` and `/upcoming-games/[id]/edit` with server actions (parse → opponent existence check → write → `revalidatePath` → redirect); the edit page returns 404 on an unknown id
- [x] 6.4 `DeleteUpcomingGameForm` on the edit page with a delete server action
- [x] 6.5 Add "Upcoming Games" to the shell nav between Games and Opponents; update the portal-shell e2e/nav test

## 7. Seed

- [ ] 7.1 Add `seed/data/upcoming-games.ts` (about 4 games dated relative to the seed day: one past, home and away, logo and no-logo opponents, all three types), keeping the existing unreferenced opponent unreferenced; wire it into seed and reset
- [ ] 7.2 Extend `seed/fixtures.test.ts` for the new coverage and reference rules

## 8. End-to-end

- [ ] 8.1 `e2e/upcoming-games.spec.ts`: create an away game (venue appears when Away is chosen, and is required), edit it to Home (venue gone), see it under Upcoming, delete it
- [ ] 8.2 Extend `e2e/publish.spec.ts` (or the publish integration test) to assert that `upcoming-games.json` is uploaded with the expected entry shape

## 9. Docs and verification

- [ ] 9.1 Update `docs/02-architecture.md` (5 of 6 artifacts generated), `docs/03-data-model.md` (UpcomingGame), `fixtures/golden/README.md` if needed, and the Obsidian vault data-model/publish notes
- [ ] 9.2 Run lint, typecheck, unit, integration, and e2e suites green
- [ ] 9.3 Manual check against prod (local portal): add the real upcoming fixtures, run `publish:preview` and inspect `artifacts/upcoming-games.json`, then publish
