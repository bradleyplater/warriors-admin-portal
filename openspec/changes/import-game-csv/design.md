## Context

Game sheets are already transcribed into the season workbook. Each game is one tab in the EIHA Rec layout, usually filled in by the `warriors-game-sheet` skill from a photo. Exporting a tab as CSV gives a grid of about 26 columns × 54 rows:

- The **home** side's player list, scoring and penalties are at the top, and the **away** side's are below.
- A "GAME DETAILS" block (teams, date, venue, competition), the period scores and the penalty minutes sit to the right.
- Shirt numbers are the only link between the event rows and the players.
- Times are game-clock `MM:SS` across the whole game (e.g. `48:42`). That is the same cumulative-minute convention the portal stores (`periodIndexOf = floor(minute / 20)`).

Creating a game today means filling in `/games/new` (details + roster) and then adding each goal and penalty separately. `createGame(GameCreateInput)` already accepts goals and penalties for both sides, so an import can create a whole game in one call.

## Goals / Non-Goals

**Goals:**
- Parse the workbook tab's CSV, match it to portal data, and show a full preview with nothing written.
- Make every unresolvable item obvious and fixable in the preview. Saving is blocked until they're fixed.
- Save through the existing `createGame` and schema, so an imported game is indistinguishable from a hand-entered one.

**Non-Goals:**
- Creating players or opponents.
- `.xlsx` or Google Drive input.
- Batch import.
- Updating existing games.
- Netminder, awards and shots.

## Decisions

### D1. Three pure layers in `lib/game-import/`
- `csv.ts`: an RFC 4180 reader (quoted fields, `""` escapes, CRLF) that turns text into `string[][]`. It's about 40 lines, so no new dependency. Papaparse would work, but the input is small and we only need reading.
- `parse-sheet.ts`: grid → `ParsedSheet`. This is the raw sheet content with no portal knowledge: team names, date string, competition, two `SheetSide`s (players `{number, name, g, a, pm}`, goals `{time, type, scorer, assist1, assist2}`, penalties `{number, pim, offence, given}`), and the period score and PIM tables.
- `resolve.ts`: `(ParsedSheet, PortalContext, Resolutions) → ImportPreview`.
  - `PortalContext` is `{ team, players, opponents, seasons, games }`.
  - `Resolutions` holds the admin's choices: `{ warriorsSide?, opponentId?, seasonId?, gameType?, players: Record<sheetNumber, playerId>, goalTypes: Record<idx, GoalType>, penaltyCodes: Record<idx, PenaltyCode> }`.
  - `ImportPreview` holds the display rows, `flags[]` (blocking) and `warnings[]`, plus `input: GameCreateInput | null`. `input` is non-null only when there are no flags.

None of these import the DB, so they're unit-tested directly against the example CSV checked in as a fixture (`lib/game-import/__fixtures__/bradford-14-11-26.csv`). This follows the repo's `no-db-import` pattern for schemas.

### D2. Locate sections by label, not by cell address
The parser scans for anchor cells:
- `HOME TEAM` / `AWAY TEAM` start each side's block.
- The `No.,PLAYER,G,A,PM,No,Time,...` header row gives column indices for the three sub-tables. Repeated headers (`G`, `A`, `A`, `No.`) are told apart by position after `PLAYER`, `Time` and `PIM`.
- `Home Team:`, `Away Team:`, `DATE:`, `Competition:`, `Period Scores` and `Penalty Minutes` are read as the first non-empty cell to their right, or the following rows for the tables.

Each side's data runs from its header row to the next side's anchor (or the end of the file). This copes with columns or rows shifting by one, and with the two `G`/`A` spellings, so a small template change won't break it. If either side's anchor is missing, the parser throws `NotAGameSheetError`.

### D3. Player matching rule
A sheet name is split into `initial` + `surname` on the first `.`, with whitespace trimmed (`"L. Coulby-Mills"` → `L`, `coulby-mills`). Comparison is case-insensitive and treats spaces and hyphens the same. Each sheet player is looked up among **active** players two ways: by number, and by `firstName[0] + surname`.

| By number | By name | Result |
|---|---|---|
| Same player | Same player | Matched |
| Player A | none / Player B | Flag: "Number N belongs to A" |
| none | Player B | Flag: "X is number M in the portal" |
| none | none | Flag: "No player with number N" |

The resolution dropdown lists **all** players (active first, sorted by number, then inactive). That way an inactive player can still be credited without reactivating them. The suggestion (the name-match or number-match player) is pre-selected but still counts as a flag until the admin confirms it. Matching only on both keeps a wrong guess from being saved silently.

### D4. Keyed by shirt number, one resolution applies everywhere
Warriors events reference players only by number, so `Resolutions.players` is keyed by sheet number. Event numbers that aren't in the player list become extra "unlisted" rows in the same table, so they're resolved the same way.

### D5. Preview and save are two server actions; the server re-derives on save
- The page is a server component. It loads `PortalContext`, minus `games`, which only the actions need.
- A client component reads the file with `File.text()` and calls `previewGameImportAction(csvText, resolutions)`, which returns an `ImportPreview`. Each change to a dropdown calls it again with the updated resolutions. The CSV is small and this keeps all matching logic in one server-side place, so no logic is duplicated on the client.
- `saveGameImportAction(csvText, resolutions)` re-parses and re-resolves from scratch. It refuses if there are any flags, re-checks that the opponent exists (via `getOpponent`, as `createGameAction` does), lets `createGame` re-validate `GameCreateInputSchema`, then calls `revalidatePath("/games")` and redirects.

The client never sends a built `GameCreateInput`, so a tampered request can only send choices, and the server validates those like any other.

Alternative considered: storing a draft game in Mongo. Rejected, because the requirement is that nothing is written before save.

### D6. Season and game type defaults
The season for a date in Aug–Dec of 20YY, or Jan–Jul of 20YY+1, is the one named `YY/YY+1`. If no such season exists, the default is the active season, flagged so the admin confirms it. Game type is read from `Competition:` against `CHALLENGE`/`BOTBC`/`LLIHC` only (NIHC is not selectable, as on `/games/new`). Otherwise it's flagged.

### D7. Bench penalties and opponents' unknown numbers
- A Warriors penalty whose `No.` is `BENCH` or `B` maps to offender `"BENCH"`.
- An opponent event whose number isn't in the opponent list uses `#<n>` as the free-text name, with a warning. Opponent names are free text in the schema, so this can't fail validation.

### D8. Cross-checks are warnings only
- Player G/A/PM vs event counts.
- Period goals: `periodIndexOf(minute)`, with SO excluded.
- Period PIMs vs the `Period Scores` / `Penalty Minutes` tables (an `OT` column counts as minute ≥ 60, which shouldn't occur).
- Duplicate check: an existing game with the same `opponentTeam.opponentId` and the same calendar date (UTC day, matching how `/games/new` stores `new Date("YYYY-MM-DD")`).

All of these are about the sheet's own consistency or likely human error, so they never block saving.

## Risks / Trade-offs

- **[Template drift]**: a differently laid-out sheet won't parse. → Parsing by label (D2) tolerates small shifts, and a sheet that isn't recognised gives a clear error, never a partial save.
- **[Wrong but plausible match]**: number and name both match the wrong person, e.g. two players with the same initial and surname. → This requires both keys to match an active player, which can't happen given the unique active-number index. The preview shows every resolved name for review.
- **[Date ambiguity]**: `DD-MM-YY` vs `MM-DD-YY`. → The workbook is UK-formatted, so DD-MM-YY is used. The preview shows the date in words and lets the admin change it before saving.
- **[Re-parsing on every dropdown change]**: an extra round trip each time. → The input is tiny and this keeps one source of truth. If it feels slow, resolution could move to the client later, since `resolve.ts` is pure.

## Migration Plan

No data or schema changes. Ship behind the normal deploy. Rollback is a revert, and imported games are ordinary games that stay valid.

## Open Questions

- Should the preview allow leaving a sheet player **off** the roster when they have no events and no portal record (e.g. a guest player)? This is currently out of scope (they must be resolved), per the "pick existing player" decision. Revisit if guest players turn up often.
