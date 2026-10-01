## Context

The website reads `upcoming-games.json` (`NextGameCard`, `routes/schedule.tsx`). The golden fixture shape is `[{ opponentTeam, logoImage, gameType, date, time, location }]`, where `location` is a rink name ("Planet Ice Peterborough") and `time` is 12-hour ("7:00 PM"). KAN-30 never generated this file because no collection backed it. add-opponents has since made opponents referenced entities with S3 logo keys, and `results.json` already enriches from them (add-opponents D8).

Constraints:
- The portal runs only locally, for a single admin. Prod collections use capitalised singular names (`Opponent`, `Game`, ...).
- The publish pipeline uploads every key of `generateAllArtifacts()` and diffs by checksum against the last successful publish (KAN-31), so a new artifact is picked up automatically once it's added there.
- The unpublished-changes indicator is `max(updatedAt)` across collections compared with the last publish.

## Goals / Non-Goals

**Goals:**
- A minimal stored record per scheduled game, managed from one page (list, add, edit, delete).
- `upcoming-games.json` generated with the fixture's shape, enriched from the opponent at publish time.

**Non-Goals:**
- Promoting an upcoming game into a played `Game` (the admin still creates the result separately).
- Seasons on upcoming games, since the output has no season.
- Recurring fixtures, bulk import, or a calendar UI.
- Website changes.

## Decisions

### D1. `UpcomingGame { _id: "UPG######", opponentId, date: "YYYY-MM-DD", time: "HH:mm", location: "HOME"|"AWAY", venue?, type, createdAt, updatedAt }`
- **Date and time as strings, not a `Date`.** They are wall-clock values in UK local time, and the output is exactly `YYYY-MM-DD` plus a local time. Storing a UTC instant would add timezone conversion (BST/GMT) on both input and output for no benefit. Strings in these forms also sort correctly lexicographically, so `{ date: 1, time: 1 }` ordering works directly. The schema checks that the date is a real calendar date.
- **`location` uses the `HOME`/`AWAY` vocabulary of `Game.location`.** `venue` is required only for away games and must be absent for home games, which is enforced in a `superRefine`. The home rink name is not stored per game. It is a single constant (`HOME_VENUE = "Planet Ice Peterborough"`) applied when publishing, so it could change in one place later.
- **`type` is a narrowed enum `["CHALLENGE", "LLIHC", "BOTBC"]`** derived from `GameTypeSchema` (`.extract`), so NIHC can't be scheduled and the labels stay shared.
- **`opponentId` is a reference only.** The name and logo are resolved at publish and display time (same as add-opponents D6), so renaming an opponent or adding a logo flows through. The opponent's existence is checked in the server action (it needs the DB), as games do.
- **Prefix `UPG`.** It is unused (`PLR`, `GME`, `OPN`, `OPP`, `PUB` are taken).

### D2. Collection `UpcomingGame` with repository `lib/repositories/upcoming-games.ts`
The repository provides `createUpcomingGame`, `getUpcomingGame`, `listUpcomingGames` (sorted `date, time`), `updateUpcomingGame`, `deleteUpcomingGame`, `countUpcomingGamesByOpponent`, and `getUpcomingGamesLatestUpdatedAt`. Indexes are `{ date: 1, time: 1 }`, `{ opponentId: 1 }`, and `{ updatedAt: -1 }`. It follows `opponents.ts`: `generateTopLevelId`, `stampCreate`/`stampUpdate`, and Zod parse on read. Updates replace the whole document (validated via `UpcomingGameSchema`) so that switching Away→Home actually drops `venue`, which a `$set` merge would leave behind.

### D3. "Today" means today in Europe/London, computed once per request or publish
A small helper `todayInLondon(now = new Date()): "YYYY-MM-DD"` (using `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" })`) is shared by the list page's Upcoming/Past split and the publish filter. A game dated today stays "upcoming" for the whole of match day. The helper takes `now` as a parameter so unit tests are deterministic.

### D4. Publish: `lib/publish/artifacts/upcoming-games.ts`
`generateUpcomingGamesArtifact(upcomingGames, opponents, today)` filters `date >= today`, sorts by date then time, and maps each game:
- `opponentTeam` is `opponent.name`, and `logoImage` is `opponent.logo?.key ?? ""`. An empty string rather than omitting the key, because the fixture and the user's example always include it.
- `gameType` reuses `competitionLabel`, extracted from `results.ts` into a shared module so the two artifacts can't diverge.
- `time` is formatted from `HH:mm` to `h:mm AM/PM` (`00:15` → `12:15 AM`, `12:00` → `12:00 PM`).
- `location` is `HOME_VENUE`, or the stored `venue`.
- A missing opponent throws with the upcoming game's id, like `results.ts`.

`generateAllArtifacts` gains `upcomingGames` and `today` parameters, and both `run.ts` and `cli.ts` load `listUpcomingGames()`. `UpcomingGameArtifactSchema` is added in `lib/publish/schemas.ts`, with `gameType: z.string()` because the fixture has `"BOTB"` while the portal emits `"BOTBC"`. That difference is pre-existing in results too and is not changed here. The schema is checked against both the golden fixture and generated output. The `README`/architecture notes that said upcoming games were "not generated" are updated.

### D5. Status indicator includes `UpcomingGame.updatedAt`
This is one more entry in `getPublishStatus`'s `Promise.all`, like opponents.

**Known gap, accepted:** a *delete* (of any entity, not just upcoming games) leaves no `updatedAt` behind, so the indicator can show "up to date" after deleting a game. Publishing is always available regardless of the indicator, so deleting a cancelled game and pressing Publish works. A related gap: a game whose date passes drops out of the *next* publish, but nothing prompts a republish. Both are the same "indicator can't see time or deletions" limitation and are left for a separate change if it matters (for example, a stored deletion watermark). This is flagged in the PR rather than solved here.

### D6. UI: `app/upcoming-games/`, mirroring `app/opponents/`
- `page.tsx` is a per-request (dynamic) list with Upcoming and Past tables. Opponent names come from one `listOpponents()` call building an id → name map.
- `new/page.tsx` and `[id]/edit/page.tsx` share `UpcomingGameForm.tsx`, which uses `useActionState`, field-level errors, and preserves values on error (same as `OpponentForm`). The form fields are:
  - an opponent `<select>` (alphabetical)
  - `<input type="date">` and `<input type="time">`
  - a Home/Away radio
  - a venue text input, rendered only when Away is selected (client state)
  - a competition `<select>` (Challenge / LLIHC / BOTBC)
- Server actions parse `FormData` and discard `venue` when location is HOME before validation (so a stale hidden value can't fail the "absent when home" rule). They check that the opponent exists, write, `revalidatePath("/upcoming-games")`, and redirect.
- Delete uses a `DeleteUpcomingGameForm` on the edit page, the same pattern as `DeleteOpponentForm`.
- A nav entry "Upcoming Games" is added between Games and Opponents.

### D7. Opponent delete guard counts both collections
`lib/opponents/service.ts` delete checks `countGamesByOpponent` and `countUpcomingGamesByOpponent`. The refusal message reports both counts when non-zero (e.g. "Used by 3 games and 1 upcoming game"). Without this, deleting an opponent would make the next publish throw.

### D8. Seed
`seed/data/upcoming-games.ts` adds about 4 games with dates offset from the seed run day (−7, +2, +9, +16 days). They cover home and away, a logo opponent and a no-logo opponent, and all three types. They reference opponents that games already reference, so the existing "an opponent referenced by nothing" fixture stays unreferenced. Seed and reset include the new collection.

## Risks / Trade-offs

- **[Stale published file after match day]** The website keeps showing a game as upcoming until the next publish. → This is the same as today's hand-maintained file. The website may filter by date itself, and publishing after any change refreshes it.
- **[Delete not flagged as unpublished]** → See D5. Accepted and flagged.
- **[Hard-coded home rink]** → A single constant. If the team moves rinks, it's a one-line change. Making it per-game was rejected by the user in favour of "home is fixed, away is typed".
- **[Seed dates relative to now]** These make seed output non-deterministic across days. → Tests assert relationships (past vs future) rather than literal dates. E2E tests create their own games where they need exact values.
- **[logoImage is an S3 key]** It is the same contract change `results.json` already made. The website follow-up from add-opponents covers both files.

## Migration Plan

No data migration is needed. `ensureIndexes` creates the new collection's indexes on first run against prod. The first publish after merge uploads `upcoming-games.json`, which replaces the hand-maintained one on the website's bucket path (an empty array if no games have been added yet). Add the real fixtures before that first publish. Rollback is to revert the code. The collection can be left in place or dropped.

## Open Questions

- None blocking. If the website's next-game card already has a fallback for an empty array, a first publish with no games entered is harmless. Otherwise, enter the games first (noted in the runbook task).
