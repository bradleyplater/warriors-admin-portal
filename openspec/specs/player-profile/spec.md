# player-profile Specification

## Purpose
TBD - created by archiving change create-a-game. Update Purpose after archive.
## Requirements
### Requirement: Admin can view a player's profile
The system SHALL render, at `/players/[id]`, that player's shirt number, name, and position(s).

#### Scenario: Player profile renders basic details
- **WHEN** an admin opens `/players/[id]` for an existing player
- **THEN** the page shows that player's shirt number, name, and position(s)

### Requirement: Player profile shows games played, grouped by season
The system SHALL render, on the player's profile page, every season from the season list as its own section, ordered ascending by season (earliest season first), each listing the games that player was rostered in during that season and a count of games played in that season. Seasons in which the player was not rostered for any game SHALL still render as an empty section.

#### Scenario: Games render grouped and ordered by season
- **WHEN** a player was rostered in games across multiple seasons
- **THEN** the player's profile shows those games in sections ordered from the earliest season to the latest, each game appearing under the season it was played in

#### Scenario: A season with no games for this player still renders
- **WHEN** a season exists in which this player was not rostered for any game
- **THEN** that season's section still renders on the player's profile, showing a games-played count of zero

#### Scenario: A newly created game updates the rostered player's profile
- **WHEN** a player is included in the roster of a newly created game
- **THEN** that player's profile shows the new game under the correct season's section, and that season's games-played count reflects the addition

### Requirement: Unknown player id renders a 404
The system SHALL render Next.js's default not-found response when `/players/[id]` is requested for an id that does not correspond to an existing player document.

#### Scenario: Unknown player id 404s
- **WHEN** `/players/[id]` is opened for an id that does not match any player document
- **THEN** the response is a 404 not-found page, not a crash or an empty profile page

### Requirement: Player profile shows derived stats per season
The system SHALL render, within each season section on the player's profile (the same sections described by "Player profile shows games played, grouped by season"), that player's derived goals, assists, points, penalty minutes (PIMs), and Man of the Match / Warrior of the Game counts for that season, as plain text alongside the existing games-played count. These values SHALL be fully derived from `Game` documents per `docs/03-data-model.md`'s "Derived stats" section, never stored.

#### Scenario: Stats render alongside games played
- **WHEN** a player's profile renders a season section
- **THEN** that section shows, in addition to the games-played count, that player's goals, assists, points, PIMs, and Man of the Match / Warrior of the Game counts for that season

#### Scenario: A season with no recorded goals, penalties, or awards shows zero
- **WHEN** a player was rostered in a season but no goals, penalties, or awards have been recorded for them
- **THEN** that season's stats render as zero, not omitted or erroring

#### Scenario: Adding, editing, or deleting a goal updates a player's stats without extra work
- **WHEN** a goal is added, edited, or deleted for a game a player was rostered in
- **THEN** that player's profile reflects the updated goals, assists, and points for the relevant season immediately, with no separate update step required beyond the goal change itself

