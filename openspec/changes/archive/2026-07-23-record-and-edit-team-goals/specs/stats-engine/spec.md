## ADDED Requirements

### Requirement: Per-player season stats are derived from games
The system SHALL provide a pure function that computes, for a given player and season, goals, assists, points (goals + assists), penalty minutes (PIMs), and Man of the Match / Warrior of the Game counts, computed entirely from `Game` documents for that season per `docs/03-data-model.md`'s Derived stats section, with no stored aggregate fields.

#### Scenario: Stats reflect all games in a season
- **WHEN** a player was rostered in multiple games within a season, scoring goals and recording assists across them
- **THEN** the derived stats sum across every game in that season

#### Scenario: Points equal goals plus assists
- **WHEN** a player's derived goals and assists are computed for a season
- **THEN** their points equal the sum of those two values

#### Scenario: PIMs sum penalty durations, with bench penalties excluded from any individual player
- **WHEN** a player has recorded penalties in a season
- **THEN** their PIMs equal the sum of those penalties' durations; penalties with `offender: "BENCH"` are not attributed to any individual player

### Requirement: Per-team season totals are derived from games
The system SHALL provide a pure function that computes, for a given team and season, total goals, assists, and PIMs across all games in that season, including bench PIMs, following the same derivation source as per-player stats.

#### Scenario: Team totals sum across all games in a season
- **WHEN** multiple games have been recorded in a season with goals and penalties
- **THEN** the team's derived totals for that season sum goals, assists, and PIMs (including bench PIMs) across all of them

### Requirement: Goal changes are reflected without special-case logic
The system SHALL derive player and team stats fresh from the current state of `Game` documents on every computation, so that adding, editing, or deleting any goal — including changing a goal's scorer — is reflected in derived stats immediately, with no migration step or stored-value patch.

#### Scenario: Changing a goal's scorer moves the stat
- **WHEN** a goal's `scoredBy` is changed from player A to player B
- **THEN** player A's derived goals and points for that season no longer include this goal, and player B's do, purely as a result of recomputing from the updated `Game` document
