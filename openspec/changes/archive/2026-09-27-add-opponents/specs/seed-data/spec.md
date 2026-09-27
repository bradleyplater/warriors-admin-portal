## MODIFIED Requirements

### Requirement: Automatic seeding of an empty database
The system SHALL provide a seed function that inserts the shared fixture dataset into the configured MongoDB database only when none of the seeded collections (`seasons`, `team`, `players`, `games`, `opponents`) already contain documents, and SHALL make no writes if any of them do.

#### Scenario: Seeding an empty database
- **WHEN** the seed function runs against a database where `seasons`, `team`, `players`, `games`, and `opponents` are all empty
- **THEN** it inserts the full fixture dataset into those collections

#### Scenario: Refusing to seed a non-empty database
- **WHEN** the seed function runs against a database where at least one of `seasons`, `team`, `players`, `games`, `opponents` already has documents
- **THEN** it makes no writes and reports that seeding was skipped

## ADDED Requirements

### Requirement: Seed dataset includes referenced opponents
The seed dataset SHALL include several opponents, at least one with no `logo` and at least one with a `logo` key and content type, and every seeded game's `opponentTeam.opponentId` SHALL reference a seeded opponent. At least one seeded opponent SHALL be referenced by no game, so deleting an unreferenced opponent can be exercised.

#### Scenario: Every game references a seeded opponent
- **WHEN** the seeded `games` and `opponents` collections are inspected
- **THEN** every game's `opponentTeam.opponentId` matches a seeded opponent's `_id`, and no game has `opponentTeam.name`

#### Scenario: Logo and reference coverage
- **WHEN** the seeded `opponents` collection is inspected
- **THEN** it contains an opponent with a logo, an opponent without a logo, and an opponent referenced by no game
