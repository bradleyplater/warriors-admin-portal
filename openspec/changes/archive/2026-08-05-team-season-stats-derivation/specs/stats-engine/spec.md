## MODIFIED Requirements

### Requirement: Per-team season totals are derived from games
The system SHALL provide a pure function that computes, for a given team and season, games played (count of games in the season), total goals, assists, and PIMs across all games in that season, including bench PIMs, following the same derivation source as per-player stats.

#### Scenario: Team totals sum across all games in a season
- **WHEN** multiple games have been recorded in a season with goals and penalties
- **THEN** the team's derived totals for that season sum goals, assists, and PIMs (including bench PIMs) across all of them

#### Scenario: Games played counts every game in the season
- **WHEN** a team has games recorded in a season
- **THEN** games played equals the number of games in that season, regardless of whether any goals or penalties were recorded in them

#### Scenario: A season with no games returns all-zero totals
- **WHEN** the derived stats function is called for a season with no recorded games
- **THEN** games played is zero, alongside zero for goals, assists, and PIMs
