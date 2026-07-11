## ADDED Requirements

### Requirement: Automatic seeding of an empty database
The system SHALL provide a seed function that inserts the shared fixture dataset into the configured MongoDB database only when none of the seeded collections (`seasons`, `team`, `players`, `games`) already contain documents, and SHALL make no writes if any of them do.

#### Scenario: Seeding an empty database
- **WHEN** the seed function runs against a database where `seasons`, `team`, `players`, and `games` are all empty
- **THEN** it inserts the full fixture dataset into those collections

#### Scenario: Refusing to seed a non-empty database
- **WHEN** the seed function runs against a database where at least one of `seasons`, `team`, `players`, `games` already has documents
- **THEN** it makes no writes and reports that seeding was skipped

### Requirement: Seed dataset coverage
The seed dataset SHALL include 4 seasons, 1 team, and enough players and games to exercise every combination called out in the ticket's acceptance criteria: ~20 players covering every position, active and inactive players, at least one player with a nickname and one with an image URL; ~10 games covering every game type, home and away location, bench penalties, goals with 0, 1, and 2 assists, every goal type including shootout, and both games with and without a netminder/Player of the Game/Warrior of the Game award.

#### Scenario: Position coverage
- **WHEN** the seeded `players` collection is inspected
- **THEN** every position (`Forward`, `Defence`, `Goaltender`) and at least one multi-position player are present, alongside active and inactive players and players with a nickname and an image URL

#### Scenario: Game coverage
- **WHEN** the seeded `games` collection is inspected
- **THEN** every game type, both locations, bench penalties, goals with each assist count, every goal type including shootout, and games both with and without a netminder/award are present

### Requirement: Legacy-shaped and drifted fixtures for migration testing
The seed dataset SHALL include at least one player document carrying legacy fields (`position` string, `teams` array) alongside its target-shape fields, and the team document SHALL carry legacy `players[]`/`stats[]` arrays whose values deliberately do not match what the stats engine would compute from the seeded games.

#### Scenario: Legacy player fixture present
- **WHEN** the seeded `players` collection is inspected
- **THEN** at least one player document has both target-shape fields (`positions`, `active`, `teamId`) and legacy fields (`position`, `teams`)

#### Scenario: Drifted team aggregate present
- **WHEN** the seeded team document's legacy `stats[]` array is compared against totals derived from the seeded games
- **THEN** at least one value differs, simulating real-world aggregate drift

### Requirement: Database reset command
The system SHALL provide an `npm run db:reset` command that drops the configured local database entirely and then runs the same seed function used elsewhere, leaving the database in the same state as a fresh seed of an empty database.

#### Scenario: Resetting a populated local database
- **WHEN** a developer runs `npm run db:reset` against a local database containing prior seed data or manual edits
- **THEN** the database is dropped and re-seeded with the standard fixture dataset

### Requirement: Local-only guard rail on seed and reset
Both the seed function's entry point and the reset command SHALL refuse to run when the configured `MONGODB_URI` does not resolve to a recognized local host (`localhost`, `127.0.0.1`, or the `mongo` Docker Compose service name), unless invoked with an explicit `--allow-remote` flag.

#### Scenario: Blocking a non-local target
- **WHEN** `npm run db:reset` or the seed command is run with `MONGODB_URI` pointing at a non-local host and without `--allow-remote`
- **THEN** the command exits with an error and makes no database changes

#### Scenario: Explicit override permits a non-local target
- **WHEN** the same command is run with `--allow-remote` passed explicitly
- **THEN** the guard rail is bypassed and the command proceeds
