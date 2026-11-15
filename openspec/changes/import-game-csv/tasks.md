## 1. CSV reading and sheet parsing (pure)

- [x] 1.1 Copy the example export into `lib/game-import/__fixtures__/bradford-14-11-26.csv`.
- [x] 1.2 Create `lib/game-import/csv.ts`, an RFC 4180 reader (`parseCsv(text): string[][]`) that handles quoted fields, `""` escapes, CRLF/LF, and a trailing newline. Unit tests should cover each of these.
- [x] 1.3 Create `lib/game-import/parse-sheet.ts`, with `parseGameSheet(grid): ParsedSheet` and `NotAGameSheetError`.
  - Use label anchors (design D2) for both sides' player lists, scoring rows, penalty rows, the team names, date, competition, and the period score and PIM tables.
  - Ignore empty rows and the stray `0` cell.
- [x] 1.4 Unit tests against the fixture:
  - the counts in the "Example sheet is read in full" scenario
  - spot-checks of specific rows (`15:25 E 82/43/39`, the opponent's `55 ROUGH 43:53`)
  - a grid with no `AWAY TEAM` throws `NotAGameSheetError`
  - shifting every column right by one still parses

## 2. Resolution against portal data (pure)

- [x] 2.1 Create `lib/game-import/types.ts`, defining `PortalContext`, `Resolutions`, `ImportPreview`, `ImportFlag` and `ImportWarning`. Flags and warnings should carry a stable `kind`, a message, and a target (a player row's number, an event index, or a detail field).
- [x] 2.2 Create `lib/game-import/resolve.ts`, with `resolveImport(sheet, context, resolutions): ImportPreview`, covering:
  - the Warriors side, location, opponent, date, season and game type defaults (D6)
  - the player match table (D3)
  - unlisted event numbers (D4)
  - the duplicate-resolution flag
  - goal-type and penalty-code mapping
  - time validation
  - bench penalties and opponent `#n` names (D7)
  - building `GameCreateInput` only when there are no flags
- [x] 2.3 Add cross-check warnings (D8): player G/A/PM, period goals, period PIMs, and a duplicate game on the same opponent and day.
- [x] 2.4 Unit tests, one per `game-csv-import` scenario, using a hand-built `PortalContext`. Include the full fixture resolving to an 11–2 AWAY game with no warnings when all 16 players match, and the built input passing `GameCreateInputSchema`.

## 3. Server actions

- [x] 3.1 Create `lib/games/import-service.ts` (the logic, so it can be integration-tested) and thin wrappers in `app/games/import/actions.ts`, covering:
  - `previewGameImportAction(csvText, resolutions)`: load the context, parse and resolve, and return the preview or a "not a recognised game sheet" error. It must not write anything.
  - `saveGameImportAction(csvText, resolutions)`: re-derive the game, refuse while there are flags, check the opponent exists, call `createGame`, call `revalidatePath("/games")`, and redirect to `/games/[id]`. Return errors on failure.
- [x] 3.2 Integration tests on the service (`tests/integration/game-import-service.test.ts`), run against the test Mongo:
  - preview leaves the games collection unchanged
  - save with all players resolved creates one game with 16 roster entries, 11/2 goals and 2/2 penalties
  - save with an unresolved flag creates nothing
  - save with a deleted opponent creates nothing

## 4. UI

- [x] 4.1 Add an **Import from CSV** `ButtonLink` to `/games`, next to **Add game**.
- [x] 4.2 Create the `app/games/import/page.tsx` server component, with a page header back to Games. It renders the client import component with players, opponents, seasons and the team.
- [x] 4.3 Create the client component `GameImport.tsx`, with:
  - a file picker that reads with `File.text()` and calls the preview action
  - a details panel (date in words, location, opponent, season, game type) with dropdowns where flagged
  - a Warriors player table (sheet no./name → portal player), with flagged rows highlighted and a player dropdown
  - Warriors goals and penalties tables, and opponent goals and penalties tables, showing resolved names and flagged cells
  - a warnings list, including the duplicate-game link
  - a flag count, and **Save to database** disabled until it reaches 0
  Re-run the preview on every resolution change. Use the `app/_ui` components and Warriors DS tokens.
- [x] 4.4 E2E `e2e/import-game-csv.spec.ts`:
  - import the fixture with one player deliberately mismatched in the seed, and see that row flagged and Save disabled
  - resolve it, then pick the game type
  - save, land on the game page, and see the score 2–11 and the goals listed

## 5. Docs and wrap-up

- [x] 5.1 Add an "Importing a game from CSV" section to the Obsidian vault's game-management note. It should cover the expected sheet layout, the matching rules, and what isn't imported.
- [x] 5.2 Run `npm run lint`, typecheck, unit, integration and e2e. Run `openspec validate import-game-csv`.
