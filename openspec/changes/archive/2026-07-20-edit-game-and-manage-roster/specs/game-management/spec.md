## ADDED Requirements

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
