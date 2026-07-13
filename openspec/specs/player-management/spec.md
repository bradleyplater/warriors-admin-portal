# player-management Specification

## Purpose
TBD - created by archiving change create-a-player. Update Purpose after archive.
## Requirements
### Requirement: Admin can create a player via a form
The system SHALL provide a form at `/players/new` capturing first name, surname, shirt number, one or more positions, an active flag, an optional nickname, and an optional image identifier, and SHALL create a new player document when the form is submitted with valid data.

#### Scenario: Valid submission creates a player
- **WHEN** the form is submitted with a first name, surname, a shirt number between 1 and 99, at least one position, and no other active player using that number
- **THEN** a new player document is created and the admin is redirected to `/players`, where the new player appears in the roster list

#### Scenario: Optional fields may be omitted
- **WHEN** the form is submitted without a nickname and without an image identifier
- **THEN** the player is created successfully with those fields absent

#### Scenario: Active flag defaults to active
- **WHEN** the form is submitted without changing the active control
- **THEN** the created player has `active: true`

### Requirement: Client and server validation share one schema
The system SHALL validate form submissions against the same `PlayerCreateInputSchema` used by the repository layer, on both the server action and any client-side reflection of errors, so no validation rule is implemented twice.

#### Scenario: Server rejects invalid data regardless of client state
- **WHEN** a form submission reaches the server action with data that fails `PlayerCreateInputSchema` (e.g. tampered request bypassing client checks)
- **THEN** the server action rejects the submission and returns field-level errors without creating a player

### Requirement: Shirt number validation failures are field-level and clear
The system SHALL reject a shirt number that is not a whole number, is outside 1–99, or is already used by another active player, and SHALL identify the failure as belonging to the shirt number field with a clear message distinguishing the three cases.

#### Scenario: Non-numeric number is rejected
- **WHEN** the shirt number field is submitted with a non-numeric value
- **THEN** the submission is rejected with a field-level error on shirt number and no player is created

#### Scenario: Out-of-range number is rejected
- **WHEN** the shirt number field is submitted with `0`, a negative number, or `100` or higher
- **THEN** the submission is rejected with a field-level error on shirt number and no player is created

#### Scenario: Duplicate active shirt number is rejected
- **WHEN** the shirt number field is submitted with a value already used by another player whose `active` is `true`
- **THEN** the server action catches the repository's `DuplicateShirtNumberError` and returns it as a field-level error on shirt number, and no player is created

#### Scenario: Same number as an inactive player is accepted
- **WHEN** the shirt number field is submitted with a value used only by a player whose `active` is `false`
- **THEN** the submission succeeds and a new player is created with that number

### Requirement: At least one position is required
The system SHALL reject a submission with no position selected, identifying the failure as belonging to the positions field.

#### Scenario: No position selected is rejected
- **WHEN** the form is submitted with zero positions checked
- **THEN** the submission is rejected with a field-level error on positions and no player is created

#### Scenario: Multiple positions are accepted
- **WHEN** the form is submitted with more than one position checked
- **THEN** the created player's positions include all of the checked values

### Requirement: Admin can edit a player via a form
The system SHALL provide a form at `/players/[id]/edit`, pre-filled with that player's current field values, and SHALL update the player document when the form is submitted with valid data. The form SHALL cover the same fields — first name, surname, shirt number, positions, active flag, nickname, image identifier — with the same validation rules as the creation form.

#### Scenario: Edit form is pre-filled with current values
- **WHEN** an admin opens `/players/[id]/edit` for an existing player
- **THEN** every field on the form is pre-filled with that player's current stored values

#### Scenario: Valid submission updates the player
- **WHEN** the edit form is submitted with a valid change to any field
- **THEN** the player document is updated and the admin is redirected to `/players`, where the change is reflected

#### Scenario: Edit form applies the same field-level validation as creation
- **WHEN** the edit form is submitted with data that would be rejected on creation (e.g. a shirt number outside 1–99, or zero positions selected)
- **THEN** the submission is rejected with the same field-level error as the creation form would produce, and the player is not updated

### Requirement: Admin can deactivate and reactivate a player from the edit form
The system SHALL treat the `active` flag as an editable field on the edit form, so that setting it to false deactivates the player and setting it back to true reactivates them, without a separate deactivation-specific control or route.

#### Scenario: Deactivating a player
- **WHEN** the edit form is submitted with the active control unchecked for a player who was previously active
- **THEN** the player's `active` field is updated to `false`, their game history and season stats remain unchanged, and their shirt number becomes available to other active players

#### Scenario: Reactivating a player whose number is free
- **WHEN** the edit form is submitted with the active control checked for a player who was previously inactive, and no other active player currently holds their shirt number
- **THEN** the player's `active` field is updated to `true`

#### Scenario: Reactivating into a taken shirt number is blocked
- **WHEN** the edit form is submitted with the active control checked for a previously inactive player, and another active player currently holds that shirt number
- **THEN** the server action catches the repository's `DuplicateShirtNumberError` and returns it as a field-level error on the shirt number field, and the player is not reactivated

