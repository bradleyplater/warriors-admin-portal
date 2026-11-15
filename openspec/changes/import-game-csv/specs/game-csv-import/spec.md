## ADDED Requirements

### Requirement: Games list offers Import from CSV
The games list at `/games` SHALL show an **Import from CSV** button alongside **Add game**, linking to `/games/import`. That page SHALL accept a single `.csv` file upload.

#### Scenario: Button opens the import page
- **WHEN** the admin clicks **Import from CSV** on `/games`
- **THEN** the admin is taken to `/games/import`, which shows a CSV file picker

#### Scenario: Non-CSV or unreadable file is rejected
- **WHEN** the admin uploads a file that is not a game-sheet CSV (e.g. no `HOME TEAM` / `AWAY TEAM` sections can be found)
- **THEN** the page shows an error saying the file isn't a recognised game sheet, and no preview is shown

### Requirement: Previewing an import writes nothing
Uploading a CSV and viewing its preview SHALL NOT create, change or delete any database document or S3 object. A game SHALL only be created when the admin clicks **Save to database**.

#### Scenario: Abandoned preview leaves no trace
- **WHEN** the admin uploads a CSV, views the preview, and then leaves the page without saving
- **THEN** the games collection is unchanged

### Requirement: Game sheet is read by its labels
The importer SHALL locate each part of the sheet by its labels (`HOME TEAM`, `AWAY TEAM`, `Scoring`, `Penalties`, `Home Team:`, `Away Team:`, `DATE:`, `Competition:`, `Period Scores`, `Penalty Minutes`), not by fixed cell positions. For each side it SHALL read:
- the player list (`No.`, `PLAYER`, `G`, `A`, `PM`)
- the scoring rows (`Time`, type, `G`, `A`, `A`)
- the penalty rows (`No.`, `PIM`, `Offence`, `Given`)

Rows with no data in the relevant columns SHALL be ignored.

#### Scenario: Example sheet is read in full
- **WHEN** the example sheet `Bradford - 14-11-26` is imported
- **THEN** the preview shows date 14 Nov 2026, Bradford Ice Wolves as the home team and Peterborough Warriors as the away team, 16 Warriors players, 11 Warriors goals, 2 Warriors penalties, 18 opponent players, 2 opponent goals and 2 opponent penalties

### Requirement: Warriors side and game details are derived from the sheet
The importer SHALL determine which side is the Warriors by matching the sheet's `Home Team:` / `Away Team:` names against the portal's team name, case-insensitively, and SHALL set the game's location to `HOME` or `AWAY` accordingly. The other side SHALL be matched to an existing opponent by name, case-insensitively and ignoring surrounding whitespace. The date SHALL be read as `DD-MM-YY`. The season SHALL default to the season covering that date. The game type SHALL be taken from `Competition:` when it names a selectable game type (`CHALLENGE`, `BOTBC`, `LLIHC`), case-insensitively.

#### Scenario: Warriors away game
- **WHEN** the sheet's away team is "Peterborough Warriors" and the portal team is named "Peterborough Warriors"
- **THEN** the preview shows location `AWAY` and uses the home side as the opponent

#### Scenario: Opponent name not found
- **WHEN** the opponent's name on the sheet matches no portal opponent
- **THEN** the opponent is flagged and the admin must choose an existing opponent before saving

#### Scenario: Warriors side not identifiable
- **WHEN** neither team name on the sheet matches the portal team name
- **THEN** the Warriors side is flagged and the admin must choose Home or Away before saving

#### Scenario: Blank competition
- **WHEN** the `Competition:` cell is blank or names no selectable game type
- **THEN** the game type is flagged and the admin must choose one before saving

#### Scenario: Season defaults from date and can be changed
- **WHEN** the sheet is dated 14-11-26 and a season "26/27" exists
- **THEN** the preview selects season 26/27, and the admin can choose a different existing season

### Requirement: Warriors players are matched by number and name
Each player in the Warriors player list SHALL be matched to an active portal player only when **both** the shirt number equals the player's `number` **and** the sheet name (`<initial>. <surname>`) matches the player's first-name initial and surname, case-insensitively. A player that does not match SHALL be flagged and highlighted, with the reason shown (no player with that number, number belongs to a differently named player, or name found under a different number).

#### Scenario: Exact match
- **WHEN** the sheet lists `3, M. Silsby` and active player Matt Silsby has number 3
- **THEN** the row is matched to that player and is not flagged

#### Scenario: Number matches but name does not
- **WHEN** the sheet lists `24, A. Johnson` and the active player with number 24 is named differently
- **THEN** the row is flagged with "Number 24 belongs to <that player's name>"

#### Scenario: Name matches under another number
- **WHEN** the sheet lists `72, D. Sztymon` and the active player named D… Sztymon has a different number
- **THEN** the row is flagged with "D. Sztymon is number <their number> in the portal"

### Requirement: Flagged players are fixed by choosing an existing player
For each flagged Warriors player, the preview SHALL offer a choice of existing portal players. The chosen player SHALL be used everywhere that sheet shirt number appears: roster, goal scorer, assists and penalty offender. Two sheet rows SHALL NOT resolve to the same portal player; when they do, both SHALL be flagged.

#### Scenario: Resolving a player updates every reference
- **WHEN** the admin resolves sheet number 3 to a portal player
- **THEN** that player appears in the roster, as scorer of every goal credited to number 3, and in every assist and penalty that references number 3

#### Scenario: Duplicate resolution is flagged
- **WHEN** two sheet rows end up matched or resolved to the same portal player
- **THEN** both rows are flagged as duplicates and saving is blocked

### Requirement: Events are converted to portal goals and penalties
Scoring and penalty times SHALL be read as game-clock `MM:SS` (cumulative across periods) into `minute` and `second`. Goal types SHALL map `E`/`EVEN` → `EVEN`, and `PP`, `SH`, `PS`, `EN`, `SO` to themselves, case-insensitively. A penalty's offence SHALL map to a penalty code by code or label, case-insensitively, and its `PIM` SHALL become its duration. Opponent goals and penalties SHALL use the name from the opponent's player list for that shirt number. When the shirt number isn't in that list, they SHALL use `#<number>` and show a warning.

#### Scenario: Warriors goal with two assists
- **WHEN** the Warriors scoring row is `5, 15:25, E, 82, 43, 39`
- **THEN** the preview shows an EVEN goal at 15:25 scored by the player resolved for number 82, assisted by those for 43 and 39

#### Scenario: Opponent penalty uses sheet name
- **WHEN** the opponent penalty row is `55, 2, ROUGH, 43:53` and the opponent's list has `55, J. Cooper`
- **THEN** the preview shows a 2-minute Roughing penalty at 43:53 for "J. Cooper"

#### Scenario: Unknown goal type or offence is flagged
- **WHEN** a scoring row's type or a penalty's offence matches no known goal type or penalty code
- **THEN** that event is flagged and the admin must choose a value before saving

#### Scenario: Event references a number not on the player list
- **WHEN** a Warriors goal, assist or penalty references a shirt number that isn't in the Warriors player list
- **THEN** that number is flagged like an unmatched player and must be resolved to a portal player before saving

#### Scenario: Out-of-range time is flagged
- **WHEN** a non-shootout event time is missing, malformed, or has a minute above 59
- **THEN** that event is flagged and saving is blocked

### Requirement: Sheet totals are cross-checked as warnings
The preview SHALL compare each Warriors player's sheet `G`, `A` and `PM` with the counts from the event rows, and each side's `Period Scores` and `Penalty Minutes` with the event rows by period. It SHALL show any mismatch as a warning that does not block saving.

#### Scenario: Consistent sheet has no warnings
- **WHEN** the example sheet `Bradford - 14-11-26` is imported
- **THEN** no total mismatch warnings are shown

#### Scenario: Player total disagrees
- **WHEN** a player's sheet `G` is 2 but only one scoring row credits their number
- **THEN** a warning names the player and shows sheet 2 vs events 1

### Requirement: Possible duplicate game is warned about
When a game already exists against the resolved opponent on the same date, the preview SHALL show a warning with a link to that game, and saving SHALL remain allowed.

#### Scenario: Same opponent same day
- **WHEN** a game against Bradford Ice Wolves on 14 Nov 2026 already exists
- **THEN** the preview warns that it may be a duplicate and links to the existing game

### Requirement: Saving creates an ordinary game
**Save to database** SHALL be disabled while any flag is unresolved. On save, the server SHALL re-read the uploaded CSV together with the admin's choices, rebuild the game, and validate it against `GameCreateInputSchema`. It SHALL also check that the chosen opponent and players exist. It SHALL then create the game through the existing `createGame`, with its roster, goals, penalties, opponent goals and opponent penalties, and redirect to `/games/[id]`. The created game SHALL be editable with the existing game forms like any other game.

#### Scenario: Successful save
- **WHEN** every flag is resolved and the admin clicks **Save to database**
- **THEN** one game is created with the previewed details and events, and the admin lands on its detail page

#### Scenario: Server rejects stale or tampered choices
- **WHEN** the save request names a player or opponent that no longer exists, or the rebuilt game fails `GameCreateInputSchema`
- **THEN** no game is created and the preview shows the errors
