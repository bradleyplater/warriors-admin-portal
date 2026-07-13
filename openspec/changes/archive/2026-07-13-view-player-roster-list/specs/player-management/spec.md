## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Minimal player list confirms creation
**Reason**: Superseded by the `roster-list` capability, which renders every player (not just a name/number confirmation list) grouped by active status at `/players`.
**Migration**: No data migration needed. The bare name-and-number list previously rendered at `/players` is replaced by the roster table defined in `roster-list`; the create form that used to share that page moves to `/players/new`.
