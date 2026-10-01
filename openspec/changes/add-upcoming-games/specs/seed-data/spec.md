## MODIFIED Requirements

### Requirement: Seed dataset includes referenced opponents
The seed dataset SHALL include several opponents, at least one with no `logo` and at least one with a `logo` key and content type, and every seeded game's `opponentTeam.opponentId` SHALL reference a seeded opponent. At least one seeded opponent SHALL be referenced by no game and no upcoming game, so deleting an unreferenced opponent can be exercised.

#### Scenario: Every game references a seeded opponent
- **WHEN** the seeded `games` and `opponents` collections are inspected
- **THEN** every game's `opponentTeam.opponentId` matches a seeded opponent's `_id`, and no game has `opponentTeam.name`

#### Scenario: Logo and reference coverage
- **WHEN** the seeded `opponents` collection is inspected
- **THEN** it contains an opponent with a logo, an opponent without a logo, and an opponent referenced by no game and no upcoming game

## ADDED Requirements

### Requirement: Seed dataset includes upcoming games
The seed dataset SHALL include upcoming games that each reference a seeded opponent, covering at least one home game, one away game with a venue, one game whose opponent has a logo, and one dated in the past. Dates SHALL be computed relative to the day the seed runs so the future and past cases stay valid over time.

#### Scenario: Upcoming game coverage
- **WHEN** the seeded upcoming games collection is inspected
- **THEN** every game references a seeded opponent and passes `UpcomingGameSchema`, and the set includes a home game, an away game, a game dated before today, and a game dated today or later
