# game-management Specification

## Purpose
TBD - created by archiving change create-a-game. Update Purpose after archive.
## Requirements
### Requirement: Admin can create a game via a form
The system SHALL provide a form at `/games/new` capturing a date, a season (selected from existing seasons), an opponent team name, a game type, a location, and a roster of players, and SHALL create a new game document when the form is submitted with valid data.

#### Scenario: Valid submission creates a game
- **WHEN** the form is submitted with a date, an existing season, a non-empty opponent name, a game type, a location, and at least one rostered player
- **THEN** a new game document is created with empty goal and penalty arrays and no netminder or award fields, and the admin is redirected to that game's detail page at `/games/[id]`

#### Scenario: Required fields must be present
- **WHEN** the form is submitted with the date, season, opponent name, game type, location, or roster missing
- **THEN** the submission is rejected with a field-level error identifying the missing field, and no game is created

### Requirement: Client and server validation share one schema
The system SHALL validate form submissions against the same `GameCreateInputSchema` used by the repository layer, on both the server action and any client-side reflection of errors, so no validation rule is implemented twice.

#### Scenario: Server rejects invalid data regardless of client state
- **WHEN** a form submission reaches the server action with data that fails `GameCreateInputSchema` (e.g. tampered request bypassing client checks)
- **THEN** the server action rejects the submission and returns field-level errors without creating a game

### Requirement: Game type picker excludes NIHC
The create-game form SHALL offer only `CHALLENGE`, `BOTBC`, and `LLIHC` as selectable game types. `NIHC` SHALL NOT be an available option on this form, even though it remains a valid value on existing historical game documents.

#### Scenario: NIHC is not offered
- **WHEN** the create-game form's game type control renders
- **THEN** the available options are exactly `CHALLENGE`, `BOTBC`, and `LLIHC`, and `NIHC` is not present

### Requirement: Roster picker offers only active players, without duplicates
The roster picker on the create-game form SHALL offer only players with `active: true`, and SHALL prevent the same player from being added to the roster more than once.

#### Scenario: Inactive players are not offered
- **WHEN** the create-game form's roster picker renders
- **THEN** only players with `active: true` appear as selectable options

#### Scenario: A player cannot be selected twice
- **WHEN** an admin attempts to add the same player to the roster more than once
- **THEN** the player appears in the submitted roster at most once

### Requirement: Games list is grouped by season
The system SHALL render, at `/games`, every recorded game grouped into one section per season, ordered ascending by season (earliest season first), with each section showing a count of games played in that season. Seasons with no games SHALL still render as an empty section.

#### Scenario: Games render grouped and ordered by season
- **WHEN** an admin opens `/games` and games exist across multiple seasons
- **THEN** the games render in sections ordered from the earliest season to the latest, each game appearing under its own season's section

#### Scenario: A season with no games still renders
- **WHEN** an admin opens `/games` and a season exists with zero recorded games
- **THEN** that season's section still renders, showing a games-played count of zero

#### Scenario: A newly created game appears in the correct season section
- **WHEN** a game is created for a given season
- **THEN** that season's section on `/games` includes the new game and its games-played count reflects the addition

### Requirement: Each game row shows a derived score
Each game listed on `/games` SHALL show that game's date, opponent name, and a score derived from its recorded goals (non-shootout goals per side, with the shootout winner receiving one additional goal if any shootout goals were recorded), not a stored or hardcoded value.

#### Scenario: A game with no recorded goals shows a 0-0 score
- **WHEN** a game has empty `team.goals` and `opponentTeam.goals` arrays
- **THEN** its row on `/games` shows a score of 0-0

### Requirement: Game rows link to the game's detail page
Each game row on `/games` SHALL be a whole-row link to that game's detail page at `/games/[id]`.

#### Scenario: Clicking a game row navigates to its detail page
- **WHEN** an admin clicks anywhere on a game's row on `/games`
- **THEN** the admin is navigated to `/games/[id]` for that specific game

### Requirement: Admin can view a game's details
The system SHALL render, at `/games/[id]`, the recorded game's date, season, opponent name, game type, location, and roster of players.

#### Scenario: Game details render after creation
- **WHEN** an admin opens `/games/[id]` for a game that was just created
- **THEN** the page shows that game's date, season, opponent name, game type, location, and the full roster of players that were recorded

### Requirement: Unknown game id renders a 404
The system SHALL render Next.js's default not-found response when `/games/[id]` is requested for an id that does not correspond to an existing game document.

#### Scenario: Unknown game id 404s
- **WHEN** `/games/[id]` is opened for an id that does not match any game document
- **THEN** the response is a 404 not-found page, not a crash or an empty detail page

### Requirement: Games list and create-game form reflect data created after server start
The `/games` and `/games/new` pages SHALL render per request rather than being statically generated at build time, so that games, seasons, and rostered players created after the server has started are visible without a rebuild.

#### Scenario: A game created after server start appears on /games
- **WHEN** a game is created while the server is already running (e.g. against a production build)
- **THEN** that game appears in its season's section on `/games` without requiring a rebuild or restart

#### Scenario: A season or player added after server start appears in the create-game form
- **WHEN** a season or active player is added to the database while the server is already running
- **THEN** that season and player appear as selectable options on `/games/new` without requiring a rebuild or restart
