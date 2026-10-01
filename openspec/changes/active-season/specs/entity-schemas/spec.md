## MODIFIED Requirements

### Requirement: Season schema and validation
The system SHALL provide a Zod schema for `Season` enforcing the id/name format and their mutual consistency from `docs/03-data-model.md`. A season MAY carry an optional boolean `active`; a missing `active` SHALL be treated the same as `false`.

#### Scenario: Valid season passes
- **WHEN** a document with `_id: "SSN2526"` and `name: "25/26"` is validated
- **THEN** validation succeeds

#### Scenario: Season with active flag passes
- **WHEN** a document with `_id: "SSN2627"`, `name: "26/27"` and `active: true` is validated
- **THEN** validation succeeds and the parsed season has `active: true`

#### Scenario: Non-boolean active flag is rejected
- **WHEN** a season document's `active` is present but not a boolean (e.g. `"yes"`)
- **THEN** validation fails with a field-level error on `active`

#### Scenario: Malformed season id is rejected
- **WHEN** a document's `_id` does not match the `SSN` + 4-digit format
- **THEN** validation fails with a field-level error on `_id`

#### Scenario: Season id and name inconsistency is rejected
- **WHEN** a document's `_id` year digits do not correspond to its `name` (e.g. `_id: "SSN2526"` with `name: "24/25"`)
- **THEN** validation fails with a field-level error identifying the mismatch
