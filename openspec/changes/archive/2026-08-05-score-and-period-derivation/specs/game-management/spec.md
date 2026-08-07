## MODIFIED Requirements

### Requirement: Game detail page shows a period-by-period score breakdown
The system SHALL render, on `/games/[id]`, a period-by-period score breakdown derived from `team.goals` and `opponentTeam.goals`: one column per period (P1, P2, P3) plus a total, and one row per side. Goals are assigned to a period by a 20-minute running clock (minute 0–19 → P1, 20–39 → P2, 40–59 → P3). Goals of type `SO` (shootout) SHALL NOT be assigned to any period; when either side has recorded one or more `SO` goals, the page SHALL instead show a separate shootout result (which side won and by what shootout tally), distinct from the period breakdown, in addition to the shootout winner's +1 already reflected in the total score.

#### Scenario: Regulation goals are bucketed into their period
- **WHEN** a game has team goals at minute 5, minute 25, and minute 45, and no opponent goals
- **THEN** `/games/[id]` shows 1 team goal in P1, 1 in P2, 1 in P3, and a team total of 3

#### Scenario: A game with no recorded goals shows an empty breakdown
- **WHEN** a game has empty `team.goals` and `opponentTeam.goals` arrays
- **THEN** `/games/[id]` shows 0-0 for each period and a 0-0 total, with no shootout result shown

#### Scenario: Shootout goals are shown as a separate result, not inside a period
- **WHEN** a game has recorded `SO`-type goals for one or both sides
- **THEN** those goals are excluded from all three period columns, and `/games/[id]` shows a separate shootout result indicating which side won

#### Scenario: The breakdown updates immediately when a goal changes
- **WHEN** a team or opponent goal is added, edited, or removed
- **THEN** the period breakdown and any shootout result on `/games/[id]` reflect that change without a separate recalculation step
- **WHEN** an opponent penalty is recorded for a game, including one naming a Warriors player by coincidence of free text
- **THEN** no rostered player's derived PIMs and no team derived PIMs for that season change, because opponent penalties are never matched against roster player ids

#### Scenario: A goal at the exact start of a period buckets into that period, not the previous one
- **WHEN** a game has a team goal at minute 20 and another at minute 39, and a team goal at minute 40
- **THEN** `/games/[id]` shows the minute-20 and minute-39 goals both in P2, and the minute-40 goal in P3
