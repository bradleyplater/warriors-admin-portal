## MODIFIED Requirements

### Requirement: Game schema and nested validation
The system SHALL provide a Zod schema for `Game`, including nested `Goal`, `Penalty`, `OpponentGoal`, and `OpponentPenalty` shapes, enforcing all single-document validation rules from `docs/03-data-model.md`: assist distinctness, time bounds, roster membership for goals, penalties, netminder, and awards, and no duplicate roster entries. The opponent is identified by `opponentTeam.opponentId`, a reference to an `Opponent` document (`OPN` followed by exactly 6 digits); `opponentTeam` SHALL NOT carry a `name`. Whether the referenced opponent exists requires the database and is enforced by the service layer, not this schema.

#### Scenario: Game references its opponent by id
- **WHEN** a game document has `opponentTeam.opponentId: "OPN123456"` and no `opponentTeam.name`
- **THEN** validation succeeds

#### Scenario: Missing or malformed opponent id is rejected
- **WHEN** a game document's `opponentTeam.opponentId` is missing or does not match `OPN` followed by 6 digits
- **THEN** validation fails with a field-level error on `opponentTeam.opponentId`

#### Scenario: Valid game passes
- **WHEN** a document with a roster, goals referencing rostered players, and penalties referencing rostered players or `"BENCH"` is validated
- **THEN** validation succeeds

#### Scenario: Goal scorer not in roster is rejected
- **WHEN** a goal's `scoredBy` references a `playerId` not present in `team.roster`
- **THEN** validation fails with a field-level error on that goal's `scoredBy` path

#### Scenario: Assist equal to scorer is rejected
- **WHEN** a goal's `assist1` or `assist2` equals its `scoredBy`
- **THEN** validation fails with a field-level error on the offending assist path

#### Scenario: Duplicate assists are rejected
- **WHEN** a goal's `assist1` and `assist2` reference the same player
- **THEN** validation fails with a field-level error on `assist2`

#### Scenario: assist2 without assist1 is rejected
- **WHEN** a goal has `assist2` set but `assist1` unset
- **THEN** validation fails with a field-level error on `assist2`

#### Scenario: Time value out of bounds is rejected
- **WHEN** a goal's or penalty's `second` is outside `0–59`
- **THEN** validation fails with a field-level error on `second`

#### Scenario: Non-shootout goal minute outside game length is rejected
- **WHEN** a goal's `type` is not `"SO"` and its `minute` is outside `0–59`
- **THEN** validation fails with a field-level error on `minute`

#### Scenario: Shootout goal minute is not bounded by game length
- **WHEN** a goal's `type` is `"SO"` and its `minute` is outside `0–59`
- **THEN** validation succeeds, since shootout goals sit outside periods

#### Scenario: Penalty offender is BENCH
- **WHEN** a penalty's `offender` is the literal `"BENCH"`
- **THEN** validation succeeds (bench is a valid offender independent of roster membership)

#### Scenario: Penalty offender not in roster and not BENCH is rejected
- **WHEN** a penalty's `offender` is neither a rostered `playerId` nor `"BENCH"`
- **THEN** validation fails with a field-level error on `offender`

#### Scenario: Non-positive penalty duration is rejected
- **WHEN** a penalty's `duration` is `0` or negative
- **THEN** validation fails with a field-level error on `duration`

#### Scenario: Netminder or award not in roster is rejected
- **WHEN** `netminderPlayerId`, `manOfTheMatchPlayerId`, or `warriorOfTheGamePlayerId` references a `playerId` not present in `team.roster`
- **THEN** validation fails with a field-level error on that field

#### Scenario: Duplicate roster entries are rejected
- **WHEN** `team.roster` contains the same `playerId` more than once
- **THEN** validation fails with a field-level error on the duplicate roster entry

#### Scenario: Opponent goals and penalties use free text, not roster checks
- **WHEN** an `opponentTeam` goal's `scoredBy` or penalty's `offender` is any non-empty string
- **THEN** validation succeeds, since opponent players are not rostered entities

#### Scenario: Schema does not check blocked roster removal
- **WHEN** a `Game` document is validated in isolation
- **THEN** the schema does not attempt to determine whether removing a roster entry would orphan a reference (that check requires comparing against an edit, and is enforced elsewhere)
