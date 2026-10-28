## ADDED Requirements

### Requirement: Game photos schema
The `Game` schema SHALL accept an optional `photos` array of at most 6 entries. Each entry SHALL have:
- `key`: a string matching `games/<the game's _id>/photos/<name>.webp`
- `alt`: an optional, trimmed string of at most 250 characters
- `caption`: an optional, trimmed string of at most 250 characters

Keys SHALL be unique within the array. The array order is the display order. A missing `photos` field SHALL be treated the same as an empty array.

#### Scenario: Game without photos passes
- **WHEN** an otherwise valid game document has no `photos` field
- **THEN** validation succeeds

#### Scenario: Game with valid photos passes
- **WHEN** game `GAM000001` has `photos: [{ key: "games/GAM000001/photos/1761500000000-ab12cd.webp", caption: "Opening face-off" }]`
- **THEN** validation succeeds

#### Scenario: More than six photos is rejected
- **WHEN** a game document has 7 entries in `photos`
- **THEN** validation fails with a field-level error on `photos` saying a game can have at most 6 photos

#### Scenario: Key belonging to another game is rejected
- **WHEN** game `GAM000001` has a photo whose key is `games/GAM000002/photos/x.webp`
- **THEN** validation fails with a field-level error on that photo's `key`

#### Scenario: Non-WebP key is rejected
- **WHEN** a photo key ends in `.jpg`
- **THEN** validation fails with a field-level error on that photo's `key`

#### Scenario: Duplicate keys are rejected
- **WHEN** two entries in `photos` have the same `key`
- **THEN** validation fails with a field-level error on `photos`

#### Scenario: Over-long caption is rejected
- **WHEN** a photo's `caption` is longer than 250 characters
- **THEN** validation fails with a field-level error on that photo's `caption`
