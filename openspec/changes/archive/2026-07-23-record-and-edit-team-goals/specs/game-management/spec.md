## ADDED Requirements

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
