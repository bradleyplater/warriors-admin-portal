## Why

Every game is already transcribed from the paper EIHA Rec game sheet into a tab of the season workbook (`Warriors 26/27.xlsx`). Then the admin re-keys the same game into the portal by hand: the details, the roster, and every goal, assist and penalty for both sides. That double entry is slow and error-prone. Exporting the workbook tab as a CSV and importing it removes most of the re-keying, and the admin still checks everything before anything is saved.

## What Changes

- The games list (`/games`) gets an **Import from CSV** button next to **Add game**. It opens a new page, `/games/import`.
- The admin uploads one game-sheet CSV (a workbook tab exported as CSV, laid out like the example `Bradford - 14-11-26`). The portal reads it and shows a **preview** of everything it captured. **Nothing is written to the database at this stage.** The preview covers:
  - game details: date, home/away, opponent, season and game type
  - the Warriors roster
  - Warriors goals (scorer, assists, time, type) and penalties (offender, offence, time, duration)
  - opponent goals and penalties, with the opponent's shirt numbers turned into names from their own player list on the sheet
- Each Warriors player on the sheet is matched to a portal player by **shirt number and name together** (initial + surname against active players). When a player can't be matched, the preview flags and highlights them. The admin fixes it by choosing an existing portal player, and that choice applies everywhere the shirt number appears (roster, goals, assists, penalties).
- Other things the portal can't work out are flagged for the admin to choose: the opponent (when its name doesn't match one in the portal), which side is the Warriors, an unknown goal type or penalty code, and the game type (when the sheet's Competition cell is blank or unknown). The season defaults from the game date and can be changed.
- Non-blocking **warnings** are shown when:
  - a player's G/A/PIM totals on the sheet disagree with the event rows
  - the sheet's period scores or penalty minutes disagree with the event rows
  - a game against the same opponent on the same date already exists (with a link to it)
- **Save to database** stays disabled while any flag is unresolved. Saving creates a normal game, with its roster, goals and penalties, through the existing `createGame`. The admin is then taken to that game's page, where it can be edited like any other game.

Out of scope:
- Creating new players or opponents from the import. Missing ones are added through the existing Players/Opponents pages first, then picked in the preview.
- Reading `.xlsx` directly, reading from Google Drive, or importing several games at once.
- Netminder, shots on goal, officials, attendance and Player of the Game. The admin sets these afterwards with the existing forms.
- Updating an existing game from a CSV. Import only ever creates a new game.

## Capabilities

### New Capabilities
- `game-csv-import`: uploading a game-sheet CSV, parsing it, matching players and the opponent, previewing the result with flags and warnings, resolving the flags, and saving it as a new game.

### Modified Capabilities
(none — the games list's new button is specified under `game-csv-import`, and saving goes through the existing create-game rules unchanged)

## Impact

- **Portal code:**
  - new `lib/game-import/`: a CSV reader, a game-sheet parser, and a resolver that matches the sheet against portal data and builds a `GameCreateInput`. All of it is pure and unit-tested against the example sheet.
  - new `app/games/import/`: the page, a client preview component, and two server actions (preview and save)
  - `app/games/page.tsx` (the new button)
- **Dependencies:** none. The CSV reader is small and written in-house.
- **Data:** no schema change and no migration. Imported games are ordinary `Game` documents.
- **Docs:** a short note on the import in the Obsidian vault's game-management note.
