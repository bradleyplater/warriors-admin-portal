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

### Requirement: Player profile excludes goal, penalty, and award stats
The player profile page SHALL NOT display goals, assists, points, penalty minutes, or Player of the Game / Warrior of the Game counts. It shows only games-played counts derived from roster membership.

#### Scenario: No goal or penalty derived stats are shown
- **WHEN** an admin opens a player's profile page
- **THEN** no goals, assists, points, penalty-minute totals, or award counts are displayed

### Requirement: Unknown player id renders a 404
The system SHALL render Next.js's default not-found response when `/players/[id]` is requested for an id that does not correspond to an existing player document.

#### Scenario: Unknown player id 404s
- **WHEN** `/players/[id]` is opened for an id that does not match any player document
- **THEN** the response is a 404 not-found page, not a crash or an empty profile page
