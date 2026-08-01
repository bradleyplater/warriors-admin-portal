## ADDED Requirements

### Requirement: Admin can record a goal for the opponent
The system SHALL provide a form at `/games/[id]/opponent-goals/new` capturing a scorer name (free text), a minute, a second, and a goal type, and SHALL add the goal to the game's `opponentTeam.goals` when submitted with valid data.

#### Scenario: Valid opponent goal is added
- **WHEN** the opponent goal form is submitted with a non-empty scorer name, a minute, a second between 0 and 59, and a valid type
- **THEN** a new goal is added to the game's `opponentTeam.goals`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Server validation matches the shared opponent goal schema
- **WHEN** an opponent goal submission reaches the server action with data that fails `OpponentGoalCreateInputSchema` (e.g. an empty scorer name or an out-of-range second)
- **THEN** the server action rejects the submission and returns field-level errors without adding a goal

### Requirement: Admin can edit an existing opponent goal
The system SHALL provide a form at `/games/[id]/opponent-goals/[opponentGoalId]/edit`, pre-filled with the goal's current scorer name, minute, second, and type, and SHALL update that goal in place when submitted with valid data.

#### Scenario: Valid edit updates the opponent goal
- **WHEN** the edit form is submitted with a changed scorer name, minute, second, or type, all otherwise valid
- **THEN** the goal is updated in the game's `opponentTeam.goals`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Invalid edit is rejected with the same validation as recording an opponent goal
- **WHEN** the edit form is submitted with data that fails the same validation rules used when recording an opponent goal
- **THEN** the submission is rejected with a field-level error, and the goal is not updated

### Requirement: Admin can delete an opponent goal
The system SHALL allow deleting a goal from a game's `opponentTeam.goals`, removing it and redirecting to the game's detail page at `/games/[id]`.

#### Scenario: Deleting an opponent goal removes it
- **WHEN** an admin deletes a recorded opponent goal
- **THEN** the goal no longer appears in the game's `opponentTeam.goals`

### Requirement: Game detail page lists recorded opponent goals
The system SHALL render, on `/games/[id]`, a list of the game's recorded opponent goals showing each goal's scorer name, minute:second, and type, with links to record a new opponent goal and to edit or delete each listed opponent goal.

#### Scenario: Recorded opponent goals render on the game detail page
- **WHEN** a game has one or more recorded opponent goals
- **THEN** each opponent goal's scorer name, time, and type are shown on `/games/[id]`

#### Scenario: A game with no opponent goals shows an empty state
- **WHEN** a game has no recorded opponent goals
- **THEN** the opponent goals section on `/games/[id]` renders with no goals listed, rather than erroring

### Requirement: Admin can record a penalty for the opponent
The system SHALL provide a form at `/games/[id]/opponent-penalties/new` capturing an offender name (free text), a minute, a second, a penalty type, and a duration in minutes, and SHALL add the penalty to the game's `opponentTeam.penalties` when submitted with valid data. The penalty type picker SHALL show friendly labels (e.g. "Tripping"), not raw codes (e.g. `TRIP`).

#### Scenario: Valid opponent penalty is added
- **WHEN** the opponent penalty form is submitted with a non-empty offender name, a minute, a second between 0 and 59, a valid type, and a duration greater than 0
- **THEN** a new penalty is added to the game's `opponentTeam.penalties`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Server validation matches the shared opponent penalty schema
- **WHEN** an opponent penalty submission reaches the server action with data that fails `OpponentPenaltyCreateInputSchema` (e.g. an empty offender name, a non-positive duration, or an out-of-range second)
- **THEN** the server action rejects the submission and returns field-level errors without adding a penalty

### Requirement: Admin can edit an existing opponent penalty
The system SHALL provide a form at `/games/[id]/opponent-penalties/[opponentPenaltyId]/edit`, pre-filled with the penalty's current offender name, minute, second, type, and duration, and SHALL update that penalty in place when submitted with valid data.

#### Scenario: Valid edit updates the opponent penalty
- **WHEN** the edit form is submitted with a changed offender name, minute, second, type, or duration, all otherwise valid
- **THEN** the penalty is updated in the game's `opponentTeam.penalties`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Invalid edit is rejected with the same validation as recording an opponent penalty
- **WHEN** the edit form is submitted with data that fails the same validation rules used when recording an opponent penalty
- **THEN** the submission is rejected with a field-level error, and the penalty is not updated

### Requirement: Admin can delete an opponent penalty
The system SHALL allow deleting a penalty from a game's `opponentTeam.penalties`, removing it and redirecting to the game's detail page at `/games/[id]`.

#### Scenario: Deleting an opponent penalty removes it
- **WHEN** an admin deletes a recorded opponent penalty
- **THEN** the penalty no longer appears in the game's `opponentTeam.penalties`

### Requirement: Game detail page lists recorded opponent penalties
The system SHALL render, on `/games/[id]`, a list of the game's recorded opponent penalties showing each penalty's offender name, minute:second, type (friendly label), and duration, with links to record a new opponent penalty and to edit or delete each listed opponent penalty.

#### Scenario: Recorded opponent penalties render on the game detail page
- **WHEN** a game has one or more recorded opponent penalties
- **THEN** each opponent penalty's offender name, time, type, and duration are shown on `/games/[id]`

#### Scenario: A game with no opponent penalties shows an empty state
- **WHEN** a game has no recorded opponent penalties
- **THEN** the opponent penalties section on `/games/[id]` renders with no penalties listed, rather than erroring

### Requirement: Opponent events never affect Warriors player or team statistics
Recording, editing, or deleting an opponent goal or opponent penalty SHALL NOT change any Warriors player's derived goals, assists, points, or PIMs, nor the team's derived PIMs, since derived stats are computed only from `team.goals` and `team.penalties`.

#### Scenario: Recording an opponent goal does not change any player's derived stats
- **WHEN** an opponent goal is recorded for a game
- **THEN** no rostered player's derived goals, assists, or points for that season change

#### Scenario: Recording an opponent penalty does not change any player's or the team's derived PIMs
- **WHEN** an opponent penalty is recorded for a game, including one naming a Warriors player by coincidence of free text
- **THEN** no rostered player's derived PIMs and no team derived PIMs for that season change, because opponent penalties are never matched against roster player ids

## MODIFIED Requirements

### Requirement: Each game row shows a derived score
Each game listed on `/games` SHALL show that game's date, opponent name, and a score derived from its recorded goals (non-shootout goals per side, with the shootout winner receiving one additional goal if any shootout goals were recorded), not a stored or hardcoded value.

#### Scenario: A game with no recorded goals shows a 0-0 score
- **WHEN** a game has empty `team.goals` and `opponentTeam.goals` arrays
- **THEN** its row on `/games` shows a score of 0-0

#### Scenario: A recorded opponent goal counts toward the opponent's score
- **WHEN** a game has one or more recorded non-shootout `opponentTeam.goals`
- **THEN** the opponent's side of the derived score on `/games` and on `/games/[id]` includes those goals
