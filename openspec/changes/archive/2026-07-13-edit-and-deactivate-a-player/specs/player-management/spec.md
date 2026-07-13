## ADDED Requirements

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
