## Why

The website already reads `upcoming-games.json` (its next-game card and schedule page), but the portal has never generated it, because nothing stores scheduled games (see KAN-30 / `docs/02-architecture.md`). Now that opponents are managed entities, an upcoming game can be a small record pointing at an opponent. That lets the admin maintain the fixture list and publish it with everything else.

## What Changes

- New `UpcomingGame` entity (`UPG` + 6-digit id): `opponentId`, `date` (`YYYY-MM-DD`), `time` (`HH:mm`, 24h), `location` (`HOME` | `AWAY`), `venue` (required when away, absent when home), `type` (`CHALLENGE` | `LLIHC` | `BOTBC`), plus audit timestamps. It is stored in a new `UpcomingGame` collection.
- New Upcoming Games area (`/upcoming-games`). It lists games split into **Upcoming** (today or later, soonest first) and **Past** (most recent first), and lets the admin add, edit, and delete. The add/edit form is an opponent picker, date, time, Home/Away, venue (shown only when Away), and competition.
- Publish generates `upcoming-games.json` as `[{ opponentTeam, logoImage, gameType, date, time, location }]`, using the golden fixture's shape:
  - `opponentTeam`: the opponent's current name. `logoImage`: the opponent's logo S3 key, or `""` when it has none.
  - `gameType`: the same label mapping `results.json` uses (`CHALLENGE` → `"Challenge"`, others unchanged).
  - `time`: 12-hour (`"20:30"` → `"8:30 PM"`).
  - `location`: `"Planet Ice Peterborough"` for home games, or the typed venue for away games.
  - Only games dated today or later (Europe/London) are included, sorted by date then time.
- The publish status indicator counts the new collection's latest `updatedAt`.
- Deleting an opponent is also blocked while any upcoming game references it.
- Seed data gains a few upcoming games (future, past, home, away, with and without a logo).

Out of scope: converting an upcoming game into a played `Game`, `awards.json`, and any website changes. The output matches the shape the website already reads, apart from `logoImage` being an S3 key, which is already true of `results.json`.

## Capabilities

### New Capabilities
- `upcoming-game-management`: UpcomingGame schema and repository, the `/upcoming-games` pages (list, create, edit, delete), and generating `upcoming-games.json` at publish time.

### Modified Capabilities
- `data-access-layer`: an `upcoming-games` repository joins the per-collection list, and `UPG` joins the collision-safe id scheme.
- `opponent-management`: opponent deletion is also blocked by referencing upcoming games.
- `portal-shell`: shell navigation includes an Upcoming Games link.
- `seed-data`: seed includes upcoming games referencing seeded opponents.

## Impact

- **Code**: `lib/schemas/` (new `upcoming-game.ts`, and `GameType` narrowed for selection), `lib/repositories/` (new `upcoming-games.ts`, `collections.ts`, `indexes.ts`), `app/upcoming-games/` (new), `app/layout.tsx` nav, `lib/opponents/service.ts` (delete guard), `lib/publish/` (`generate.ts`, `run.ts`, `cli.ts`, `status.ts`, new `artifacts/upcoming-games.ts`, `schemas.ts`), `seed/`.
- **Data**: a new, empty `UpcomingGame` collection in prod (indexes are created by `ensureIndexes`). Existing documents are not migrated.
- **S3**: one new published object, `upcoming-games.json`, at the bucket root next to the other artifacts. There are no IAM or CDN changes.
- **Docs**: `docs/02-architecture.md` (publish pipeline: 5 of 6 artifacts now generated), `docs/03-data-model.md`, `fixtures/golden/README.md` notes, and the Obsidian vault data-model note.
