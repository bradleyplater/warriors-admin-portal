## MODIFIED Requirements

### Requirement: Per-player season stats are derived from games
The system SHALL provide a pure function that computes, for a given player and season, games played (count of games in the season where the player was rostered), goals, assists, points (goals + assists), penalty minutes (PIMs), and Man of the Match / Warrior of the Game counts, computed entirely from `Game` documents for that season per `docs/03-data-model.md`'s Derived stats section, with no stored aggregate fields. Games played SHALL be determined by the function itself checking roster membership (`Game.team.roster`), not by requiring callers to pre-filter the games they pass in.

#### Scenario: Stats reflect all games in a season
- **WHEN** a player was rostered in multiple games within a season, scoring goals and recording assists across them
- **THEN** the derived stats sum across every game in that season

#### Scenario: Points equal goals plus assists
- **WHEN** a player's derived goals and assists are computed for a season
- **THEN** their points equal the sum of those two values

#### Scenario: PIMs sum penalty durations, with bench penalties excluded from any individual player
- **WHEN** a player has recorded penalties in a season
- **THEN** their PIMs equal the sum of those penalties' durations; penalties with `offender: "BENCH"` are not attributed to any individual player

#### Scenario: Games played counts rostered games regardless of involvement
- **WHEN** a player was rostered in a game in a season but neither scored, assisted, took a penalty, nor received an award in it
- **THEN** that game still counts toward their games-played total for the season

#### Scenario: A player never rostered in a season returns zero games played
- **WHEN** the derived stats function is called for a player who was not rostered in any game within the given season
- **THEN** games played is zero, alongside zero for every other stat
