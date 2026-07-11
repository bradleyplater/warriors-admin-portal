## ADDED Requirements

### Requirement: Shared enum definitions
The system SHALL provide Zod enums for `Position`, `GameType`, `GoalType`, and `PenaltyCode` matching `docs/03-data-model.md` exactly, importable by both client and server code.

#### Scenario: Position enum accepts documented values
- **WHEN** a value of `"Forward"`, `"Defence"`, or `"Goaltender"` is validated against the `Position` enum
- **THEN** validation succeeds

#### Scenario: GameType enum accepts all four values unconditionally
- **WHEN** a value of `"CHALLENGE"`, `"BOTBC"`, `"LLIHC"`, or `"NIHC"` is validated against the `GameType` enum
- **THEN** validation succeeds regardless of whether the game is newly created or historical

#### Scenario: PenaltyCode enum contains all 29 documented codes
- **WHEN** any of the 29 penalty codes listed in `docs/03-data-model.md` (including `HOST`) is validated against the `PenaltyCode` enum
- **THEN** validation succeeds

#### Scenario: Unknown enum value is rejected
- **WHEN** a value not present in the enum's documented list is validated
- **THEN** validation fails with a field-level error identifying the invalid value

### Requirement: Season schema and validation
The system SHALL provide a Zod schema for `Season` enforcing the id/name format and their mutual consistency from `docs/03-data-model.md`.

#### Scenario: Valid season passes
- **WHEN** a document with `_id: "SSN2526"` and `name: "25/26"` is validated
- **THEN** validation succeeds

#### Scenario: Malformed season id is rejected
- **WHEN** a document's `_id` does not match the `SSN` + 4-digit format
- **THEN** validation fails with a field-level error on `_id`

#### Scenario: Season id and name inconsistency is rejected
- **WHEN** a document's `_id` year digits do not correspond to its `name` (e.g. `_id: "SSN2526"` with `name: "24/25"`)
- **THEN** validation fails with a field-level error identifying the mismatch

### Requirement: Player schema and validation
The system SHALL provide a Zod schema for `Player` enforcing number range, non-empty positions, and optional fields (`nickname`, `imageUrl`) from `docs/03-data-model.md`. Uniqueness of `number` among active players is explicitly NOT enforced by this schema.

#### Scenario: Valid player passes
- **WHEN** a document with `number: 42`, `positions: ["Forward"]`, and required identity fields is validated
- **THEN** validation succeeds

#### Scenario: Number out of range is rejected
- **WHEN** a document's `number` is `0` or `100` or higher
- **THEN** validation fails with a field-level error on `number`

#### Scenario: Empty positions array is rejected
- **WHEN** a document's `positions` array is empty
- **THEN** validation fails with a field-level error on `positions`

#### Scenario: Schema does not check number uniqueness
- **WHEN** two separate documents both validated independently share the same `number`
- **THEN** both validate successfully in isolation (uniqueness is enforced elsewhere, not by this schema)

### Requirement: Team schema
The system SHALL provide a Zod schema for `Team` covering identity fields only (`_id`, `name`, audit timestamps), per the slimmed target shape in `docs/03-data-model.md`.

#### Scenario: Valid team passes
- **WHEN** a document with `_id: "TM551420"` and `name: "Peterborough Warriors"` is validated
- **THEN** validation succeeds

#### Scenario: Legacy aggregate fields are not part of the schema
- **WHEN** a document is validated against the `Team` schema
- **THEN** the schema has no fields for `players[]` or `stats[]`

### Requirement: Game schema and nested validation
The system SHALL provide a Zod schema for `Game`, including nested `Goal`, `Penalty`, `OpponentGoal`, and `OpponentPenalty` shapes, enforcing all single-document validation rules from `docs/03-data-model.md`: assist distinctness, time bounds, and roster membership for goals, penalties, netminder, and awards.

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

#### Scenario: Opponent goals and penalties use free text, not roster checks
- **WHEN** an `opponentTeam` goal's `scoredBy` or penalty's `offender` is any non-empty string
- **THEN** validation succeeds, since opponent players are not rostered entities

#### Scenario: Schema does not check blocked roster removal
- **WHEN** a `Game` document is validated in isolation
- **THEN** the schema does not attempt to determine whether removing a roster entry would orphan a reference (that check requires comparing against an edit, and is enforced elsewhere)

### Requirement: Publishes schema
The system SHALL provide a Zod schema for the `Publishes` (publish log) entity matching the shape in `docs/03-data-model.md`.

#### Scenario: Valid publish record passes
- **WHEN** a document with `startedAt`, `completedAt`, `artifacts[]`, and `status: "success"` is validated
- **THEN** validation succeeds

#### Scenario: Failed status requires no additional fields to validate
- **WHEN** a document has `status: "failed"` and an `error` string
- **THEN** validation succeeds

### Requirement: Create-input schema variants
For each entity, the system SHALL provide a derived create-input schema that omits `_id`, `createdAt`, and `updatedAt`, for use where a document is validated before those fields are assigned (e.g. client-side form submission, prior to KAN-14's ID generation).

#### Scenario: Create-input schema omits generated fields
- **WHEN** a form payload without `_id`, `createdAt`, or `updatedAt` is validated against an entity's create-input schema
- **THEN** validation succeeds without those fields present

#### Scenario: Base schema still requires generated fields
- **WHEN** a payload without `_id`, `createdAt`, or `updatedAt` is validated against an entity's base (stored) schema
- **THEN** validation fails with field-level errors on the missing fields

### Requirement: Identical validation on client and server
The system SHALL expose every schema from a single module importable by both client-side form code and server-side actions/route handlers, so the same input produces the same validation result and the same field-level error messages regardless of where it runs.

#### Scenario: Same invalid input produces the same error on both sides
- **WHEN** the same invalid payload is validated using the same schema once in a client context and once in a server context
- **THEN** both produce equivalent field-level error messages, because both call the identical schema
