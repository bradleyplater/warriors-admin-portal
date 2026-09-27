## MODIFIED Requirements

### Requirement: Admin can create a game via a form
The system SHALL provide a form at `/games/new` capturing a date, a season (selected from existing seasons), an opponent (selected from existing opponents, sorted by name), a game type, a location, and a roster of players, and SHALL create a new game document storing the selected opponent's id in `opponentTeam.opponentId` when the form is submitted with valid data. The form SHALL NOT offer free-text opponent entry or inline opponent creation; opponents are created only on the Opponents page.

#### Scenario: Valid submission creates a game
- **WHEN** the form is submitted with a date, an existing season, an existing opponent, a game type, a location, and at least one rostered player
- **THEN** a new game document is created with `opponentTeam.opponentId` set to the selected opponent, empty goal and penalty arrays, and no netminder or award fields, and the admin is redirected to that game's detail page at `/games/[id]`

#### Scenario: Required fields must be present
- **WHEN** the form is submitted with the date, season, opponent, game type, location, or roster missing
- **THEN** the submission is rejected with a field-level error identifying the missing field, and no game is created

#### Scenario: Non-existent opponent is rejected
- **WHEN** a submission reaches the server action with an `opponentId` that matches no opponent (e.g. a tampered request, or an opponent deleted after the form loaded)
- **THEN** the submission is rejected with a field-level error on the opponent field, and no game is created

### Requirement: Each game row shows a derived score
Each game listed on `/games` SHALL show that game's date, the current name of its referenced opponent, and a score derived from its recorded goals (non-shootout goals per side, with the shootout winner receiving one additional goal if any shootout goals were recorded), not a stored or hardcoded value.

#### Scenario: A game with no recorded goals shows a 0-0 score
- **WHEN** a game has empty `team.goals` and `opponentTeam.goals` arrays
- **THEN** its row on `/games` shows a score of 0-0

#### Scenario: A recorded opponent goal counts toward the opponent's score
- **WHEN** a game has one or more recorded non-shootout `opponentTeam.goals`
- **THEN** the opponent's side of the derived score on `/games` and on `/games/[id]` includes those goals

#### Scenario: Row shows the referenced opponent's current name
- **WHEN** a game references an opponent that has since been renamed
- **THEN** its row on `/games` shows the opponent's new name

### Requirement: Admin can view a game's details
The system SHALL render, at `/games/[id]`, the recorded game's date, season, the current name of its referenced opponent, game type, location, roster of players, and its current netminder (each shown as "Not set" when unset), plus its current Player of the Game and Warrior of the Game under a separate "Awards" heading.

#### Scenario: Game details render after creation
- **WHEN** an admin opens `/games/[id]` for a game that was just created
- **THEN** the page shows that game's date, season, opponent name, game type, location, the full roster of players that were recorded, and "Not set" for netminder, Player of the Game, and Warrior of the Game

#### Scenario: Netminder and awards render once set
- **WHEN** a game has a netminder, Player of the Game, or Warrior of the Game selected
- **THEN** `/games/[id]` shows that selection by player name instead of "Not set"

### Requirement: Admin can edit an existing game's details
The system SHALL provide a form at `/games/[id]/edit`, pre-filled with the game's current date, season, opponent (selected in an opponent picker), game type, location, and netminder (selected from the game's roster, with a "None" option), and SHALL update the game document when the form is submitted with valid data. This form SHALL NOT modify the game's roster, Player of the Game, or Warrior of the Game.

#### Scenario: Valid edit updates the game
- **WHEN** the edit form is submitted with a changed date, season, opponent, game type, or location, all otherwise valid
- **THEN** the game document is updated with the new values (a changed opponent updating `opponentTeam.opponentId`), and the admin is redirected to that game's detail page at `/games/[id]`

#### Scenario: Invalid edit is rejected with the same validation as creation
- **WHEN** the edit form is submitted with data that fails the same validation rules used at game creation, including a non-existent opponent
- **THEN** the submission is rejected with a field-level error, and the game document is not updated

#### Scenario: Setting the netminder
- **WHEN** the edit form is submitted selecting a rostered player as netminder
- **THEN** the game document's `netminderPlayerId` is set to that player, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Clearing the netminder
- **WHEN** the edit form is submitted with "None" selected for netminder, having previously had a rostered player selected
- **THEN** `netminderPlayerId` is unset on the game document

### Requirement: Games list and create-game form reflect data created after server start
The `/games` and `/games/new` pages SHALL render per request rather than being statically generated at build time, so that games, seasons, opponents, and rostered players created after the server has started are visible without a rebuild.

#### Scenario: A game created after server start appears on /games
- **WHEN** a game is created while the server is already running (e.g. against a production build)
- **THEN** that game appears in its season's section on `/games` without requiring a rebuild or restart

#### Scenario: A season or player added after server start appears in the create-game form
- **WHEN** a season or active player is added to the database while the server is already running
- **THEN** that season and player appear as selectable options on `/games/new` without requiring a rebuild or restart

#### Scenario: An opponent added after server start appears in the create-game form
- **WHEN** an opponent is created while the server is already running
- **THEN** that opponent appears in the opponent picker on `/games/new` without requiring a rebuild or restart
