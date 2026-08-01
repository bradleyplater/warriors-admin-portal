## ADDED Requirements

### Requirement: Admin can record a penalty for the team
The system SHALL provide a form at `/games/[id]/penalties/new` capturing an offender (a rostered player, or the literal `BENCH`), a minute, a second, a penalty type, and a duration in minutes, and SHALL add the penalty to the game's `team.penalties` when submitted with valid data. The penalty type picker SHALL show friendly labels (e.g. "Tripping"), not raw codes (e.g. `TRIP`).

#### Scenario: Valid penalty is added for a rostered player
- **WHEN** the penalty form is submitted with a rostered offender, a minute, a second between 0 and 59, a valid type, and a duration greater than 0
- **THEN** a new penalty is added to the game's `team.penalties`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Valid penalty is added against the Bench
- **WHEN** the penalty form is submitted with `Bench` selected as the offender, all other fields valid
- **THEN** a new penalty is added to the game's `team.penalties` with `offender: "BENCH"`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Server validation matches the shared penalty schema
- **WHEN** a penalty submission reaches the server action with data that fails `PenaltyCreateInputSchema` (e.g. a non-positive duration, an out-of-range second, or an offender that is neither a rostered player nor `BENCH`)
- **THEN** the server action rejects the submission and returns field-level errors without adding a penalty

### Requirement: Admin can edit an existing penalty, including reassigning the offender
The system SHALL provide a form at `/games/[id]/penalties/[penaltyId]/edit`, pre-filled with the penalty's current offender, minute, second, type, and duration, and SHALL update that penalty in place when submitted with valid data, including changing its offender between a rostered player and `Bench` in either direction.

#### Scenario: Valid edit updates the penalty
- **WHEN** the edit form is submitted with a changed offender, minute, second, type, or duration, all otherwise valid
- **THEN** the penalty is updated in the game's `team.penalties`, and the admin is redirected to the game's detail page at `/games/[id]`

#### Scenario: Invalid edit is rejected with the same validation as recording a penalty
- **WHEN** the edit form is submitted with data that fails the same validation rules used when recording a penalty
- **THEN** the submission is rejected with a field-level error, and the penalty is not updated

#### Scenario: Reassigning a penalty from a player to the Bench moves derived PIMs
- **WHEN** a penalty's offender is changed from a rostered player to `Bench`
- **THEN** that player's derived PIMs for the season no longer include this penalty's duration, and the team's derived PIMs continue to include it

### Requirement: Admin can delete a penalty
The system SHALL allow deleting a penalty from a game, removing it from `team.penalties` and redirecting to the game's detail page at `/games/[id]`.

#### Scenario: Deleting a penalty removes it and its derived PIMs
- **WHEN** an admin deletes a recorded penalty
- **THEN** the penalty no longer appears in the game's `team.penalties`, and the offender's derived PIMs (or the team's, if the offender was `Bench`) no longer include it

### Requirement: Game detail page lists recorded penalties
The system SHALL render, on `/games/[id]`, a list of the game's recorded penalties showing each penalty's offender (a player's name, or "Bench"), minute:second, type (friendly label), and duration, with links to record a new penalty and to edit or delete each listed penalty.

#### Scenario: Recorded penalties render on the game detail page
- **WHEN** a game has one or more recorded penalties
- **THEN** each penalty's offender, time, type, and duration are shown on `/games/[id]`

#### Scenario: A bench penalty shows "Bench" rather than a player name
- **WHEN** a recorded penalty has `offender: "BENCH"`
- **THEN** its entry on `/games/[id]` shows "Bench", not a player name or raw `BENCH` value

#### Scenario: A game with no penalties shows an empty state
- **WHEN** a game has no recorded penalties
- **THEN** the penalties section on `/games/[id]` renders with no penalties listed, rather than erroring
