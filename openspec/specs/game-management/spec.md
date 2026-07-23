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

### Requirement: Admin can edit an existing game's details
The system SHALL provide a form at `/games/[id]/edit`, pre-filled with the game's current date, season, opponent name, game type, and location, and SHALL update the game document when the form is submitted with valid data. This form SHALL NOT modify the game's roster.

#### Scenario: Valid edit updates the game
- **WHEN** the edit form is submitted with a changed date, season, opponent name, game type, or location, all otherwise valid
- **THEN** the game document is updated with the new values, and the admin is redirected to that game's detail page at `/games/[id]`

#### Scenario: Invalid edit is rejected with the same validation as creation
- **WHEN** the edit form is submitted with data that fails the same validation rules used at game creation
- **THEN** the submission is rejected with a field-level error, and the game document is not updated

### Requirement: Admin can manage an existing game's roster
The system SHALL provide a form at `/games/[id]/roster`, separate from the game-details edit form, allowing an admin to add and remove players from the game's roster. The player picker on this form SHALL offer every player who is either currently on the game's roster or `active: true`, so a player who has since gone inactive remains visible and removable.

#### Scenario: Adding a player to the roster
- **WHEN** the roster form is submitted with a new player added and no removals
- **THEN** that player appears in the game's roster, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Removing an unreferenced player from the roster
- **WHEN** the roster form is submitted removing a player who is not referenced by any goal, assist, penalty, the netminder selection, or an award
- **THEN** that player is removed from the game's roster, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: A removed player's games-played total updates without extra work
- **WHEN** a player is removed from a game's roster
- **THEN** that player's games-played total on `/players/[id]` no longer includes that game, with no separate update required beyond the roster change itself

### Requirement: Roster removal is blocked only for referenced players, with a specific reason shown
The system SHALL block removing a rostered player from a game only if that player is still referenced by a goal (as scorer or assist), a penalty (as offender), the netminder selection, or an award (Man of the Match or Warrior of the Game). Every other requested change in the same submission — other removals and any additions — SHALL still be applied. The blocked player SHALL remain on the roster, and the response SHALL show a message identifying, by name, each category and count referencing that player (e.g. goals scored, assists recorded, penalties taken, and which specific award or the netminder role), not a generic "still referenced" message.

#### Scenario: Removing a referenced player is blocked, others in the same submission still apply
- **WHEN** the roster form is submitted removing two players, one of whom is referenced by a goal and the other is not referenced anywhere
- **THEN** the unreferenced player is removed from the roster, the referenced player remains on the roster, and a message is shown identifying that the remaining player is still referenced by a goal

#### Scenario: Blocked message names the specific award
- **WHEN** a removal is blocked because the player is recorded as the netminder for that game
- **THEN** the shown message specifically names "netminder", not a generic "award" label

#### Scenario: Blocked message names counts across multiple reference types
- **WHEN** a removal is blocked because the player scored 2 goals, recorded 1 assist, and was Man of the Match for that game
- **THEN** the shown message states all three: 2 goals, 1 assist, and Man of the Match

### Requirement: Game detail page links to editing details and managing the roster
The system SHALL provide, on `/games/[id]`, two distinct links: one to `/games/[id]/edit` for editing game details, and one to `/games/[id]/roster` for managing the roster.

#### Scenario: Edit details link navigates to the details edit route
- **WHEN** an admin clicks the "Edit details" link on a game's detail page
- **THEN** the admin is navigated to `/games/[id]/edit` for that specific game

#### Scenario: Manage roster link navigates to the roster route
- **WHEN** an admin clicks the "Manage roster" link on a game's detail page
- **THEN** the admin is navigated to `/games/[id]/roster` for that specific game

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

### Requirement: Admin can record a goal for the team
The system SHALL provide a form at `/games/[id]/goals/new` capturing a scorer (from the game's roster), up to two assisting players (from the roster, distinct from the scorer and from each other, with a second assist requiring a first), a minute, a second, and a goal type, and SHALL add the goal to the game's `team.goals` when submitted with valid data.

#### Scenario: Valid goal is added
- **WHEN** the goal form is submitted with a rostered scorer, a minute, a second between 0 and 59, and a valid type
- **THEN** a new goal is added to the game's `team.goals`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Server validation matches the shared goal schema
- **WHEN** a goal submission reaches the server action with data that fails `GoalCreateInputSchema` (e.g. an assist equal to the scorer, an out-of-range second, or a scorer not on the roster)
- **THEN** the server action rejects the submission and returns field-level errors without adding a goal

### Requirement: Admin can edit an existing goal, including changing the scorer
The system SHALL provide a form at `/games/[id]/goals/[goalId]/edit`, pre-filled with the goal's current scorer, assists, minute, second, and type, and SHALL update that goal in place when submitted with valid data, including replacing its scorer with a different rostered player.

#### Scenario: Valid edit updates the goal
- **WHEN** the edit form is submitted with a changed scorer, assist, minute, second, or type, all otherwise valid
- **THEN** the goal is updated in the game's `team.goals`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Invalid edit is rejected with the same validation as recording a goal
- **WHEN** the edit form is submitted with data that fails the same validation rules used when recording a goal
- **THEN** the submission is rejected with a field-level error, and the goal is not updated

#### Scenario: Changing the scorer moves derived stats between players
- **WHEN** a goal's scorer is changed from one rostered player to another
- **THEN** the original scorer's derived goals and points no longer include this goal, and the new scorer's derived goals and points do, with no separate migration step

### Requirement: Admin can delete a goal
The system SHALL allow deleting a goal from a game, removing it from `team.goals` and redirecting to the game's detail page at `/games/[id]`.

#### Scenario: Deleting a goal removes it and its derived stats
- **WHEN** an admin deletes a recorded goal
- **THEN** the goal no longer appears in the game's `team.goals`, and the scorer's and assisters' derived goals, assists, and points no longer include it

### Requirement: Game detail page lists recorded goals
The system SHALL render, on `/games/[id]`, a list of the game's recorded goals showing each goal's scorer, assists (if any), minute:second, and type, with links to record a new goal and to edit or delete each listed goal.

#### Scenario: Recorded goals render on the game detail page
- **WHEN** a game has one or more recorded goals
- **THEN** each goal's scorer, assists, time, and type are shown on `/games/[id]`

#### Scenario: A game with no goals shows an empty state
- **WHEN** a game has no recorded goals
- **THEN** the goals section on `/games/[id]` renders with no goals listed, rather than erroring

