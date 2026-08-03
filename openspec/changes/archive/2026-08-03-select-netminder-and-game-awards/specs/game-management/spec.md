## ADDED Requirements

### Requirement: Admin can set, change, and clear a game's Player of the Game and Warrior of the Game
The system SHALL provide a form at `/games/[id]/awards`, separate from the game-details edit form and the roster form, with two independent selectors — Player of the Game and Warrior of the Game — each offering only the game's currently rostered players plus a "None" option, and SHALL update the corresponding field (`manOfTheMatchPlayerId` or `warriorOfTheGamePlayerId`) on the game document when submitted. Netminder is not part of this form — it is a game detail, not an award (see "Admin can edit an existing game's details").

#### Scenario: Setting an award
- **WHEN** the awards form is submitted selecting a rostered player for the Player of the Game or Warrior of the Game selector
- **THEN** the game document's corresponding field is set to that player, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Clearing an award
- **WHEN** the awards form is submitted with "None" selected for a selector that previously had a rostered player selected
- **THEN** the corresponding field is unset on the game document

#### Scenario: Awards are independent of each other
- **WHEN** the awards form is submitted selecting the same rostered player for both Player of the Game and Warrior of the Game
- **THEN** the submission succeeds and that player is recorded in each selected role

### Requirement: Awards form shows an empty-roster message when the game has no rostered players
The system SHALL render, at `/games/[id]/awards`, a message directing the admin to add players to the roster first, instead of the two selectors, when the game's roster is empty.

#### Scenario: Empty roster blocks award selection
- **WHEN** an admin opens `/games/[id]/awards` for a game with an empty roster
- **THEN** no selectors are rendered, and a message directs the admin to add players to the roster first

### Requirement: Reassigning an award moves its derived count between players
Changing the Player of the Game or Warrior of the Game from one rostered player to another, or clearing it, SHALL be reflected in each affected player's derived season award count with no separate migration step.

#### Scenario: Reassigning Player of the Game moves the count
- **WHEN** a game's Player of the Game is changed from one rostered player to another
- **THEN** the original player's derived Man of the Match count for that season no longer includes this game, and the new player's does

#### Scenario: Clearing an award removes it from the count
- **WHEN** a game's Warrior of the Game selection is cleared
- **THEN** the previously selected player's derived Warrior of the Game count for that season no longer includes this game

## MODIFIED Requirements

### Requirement: Admin can edit an existing game's details
The system SHALL provide a form at `/games/[id]/edit`, pre-filled with the game's current date, season, opponent name, game type, location, and netminder (selected from the game's roster, with a "None" option), and SHALL update the game document when the form is submitted with valid data. This form SHALL NOT modify the game's roster, Player of the Game, or Warrior of the Game.

#### Scenario: Valid edit updates the game
- **WHEN** the edit form is submitted with a changed date, season, opponent name, game type, or location, all otherwise valid
- **THEN** the game document is updated with the new values, and the admin is redirected to that game's detail page at `/games/[id]`

#### Scenario: Invalid edit is rejected with the same validation as creation
- **WHEN** the edit form is submitted with data that fails the same validation rules used at game creation
- **THEN** the submission is rejected with a field-level error, and the game document is not updated

#### Scenario: Setting the netminder
- **WHEN** the edit form is submitted selecting a rostered player as netminder
- **THEN** the game document's `netminderPlayerId` is set to that player, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Clearing the netminder
- **WHEN** the edit form is submitted with "None" selected for netminder, having previously had a rostered player selected
- **THEN** `netminderPlayerId` is unset on the game document

### Requirement: Admin can view a game's details
The system SHALL render, at `/games/[id]`, the recorded game's date, season, opponent name, game type, location, roster of players, and its current netminder (each shown as "Not set" when unset), plus its current Player of the Game and Warrior of the Game under a separate "Awards" heading.

#### Scenario: Game details render after creation
- **WHEN** an admin opens `/games/[id]` for a game that was just created
- **THEN** the page shows that game's date, season, opponent name, game type, location, the full roster of players that were recorded, and "Not set" for netminder, Player of the Game, and Warrior of the Game

#### Scenario: Netminder and awards render once set
- **WHEN** a game has a netminder, Player of the Game, or Warrior of the Game selected
- **THEN** `/games/[id]` shows that selection by player name instead of "Not set"

### Requirement: Game detail page links to editing details and managing the roster
The system SHALL provide, on `/games/[id]`, three distinct links: one to `/games/[id]/edit` for editing game details (including netminder), one to `/games/[id]/roster` for managing the roster, and one to `/games/[id]/awards` for managing Player of the Game and Warrior of the Game.

#### Scenario: Edit details link navigates to the details edit route
- **WHEN** an admin clicks the "Edit details" link on a game's detail page
- **THEN** the admin is navigated to `/games/[id]/edit` for that specific game

#### Scenario: Manage roster link navigates to the roster route
- **WHEN** an admin clicks the "Manage roster" link on a game's detail page
- **THEN** the admin is navigated to `/games/[id]/roster` for that specific game

#### Scenario: Manage awards link navigates to the awards route
- **WHEN** an admin clicks the "Manage awards" link on a game's detail page
- **THEN** the admin is navigated to `/games/[id]/awards` for that specific game
