## REMOVED Requirements

### Requirement: Player profile excludes goal, penalty, and award stats
**Reason**: KAN-20 requires that adding, editing, or deleting a goal be reflected in the scorer's and assisters' stats somewhere an admin can verify it. The player profile is where those derived numbers now surface.
**Migration**: See the new "Player profile shows derived stats per season" requirement below.

## ADDED Requirements

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
