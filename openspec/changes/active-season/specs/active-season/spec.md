## ADDED Requirements

### Requirement: Active season resolution
The system SHALL resolve exactly one active season from the seasons collection: the season with `active: true`, or, when no season is flagged, the season with the highest `_id` (the newest). When more than one season is flagged, the highest-`_id` flagged season SHALL win. When there are no seasons at all, there SHALL be no active season.

#### Scenario: Flagged season is active
- **WHEN** seasons `SSN2526` and `SSN2627` exist and only `SSN2526` has `active: true`
- **THEN** the active season is `SSN2526`

#### Scenario: Newest season is active when none is flagged
- **WHEN** seasons `SSN2425` and `SSN2526` exist and neither has `active: true`
- **THEN** the active season is `SSN2526`

#### Scenario: No seasons means no active season
- **WHEN** the seasons collection is empty
- **THEN** there is no active season

### Requirement: Admin sets the active season
The portal SHALL let the admin mark any existing season as the active season from the `/seasons` page. Setting a season active SHALL set `active: true` on it, SHALL clear `active` on every other season, and SHALL bump `updatedAt` on every season whose flag changed so the unpublished-changes indicator reports the change.

#### Scenario: Seasons page shows the active season
- **WHEN** the admin opens `/seasons`
- **THEN** the resolved active season is labelled "Active" and every other season shows a "Set active" action

#### Scenario: Switching the active season
- **WHEN** `SSN2526` is active and the admin chooses "Set active" on `SSN2627`
- **THEN** `SSN2627` has `active: true`, `SSN2526` no longer has `active: true`, and both have a newer `updatedAt`

#### Scenario: Unknown season cannot be activated
- **WHEN** a request asks to activate a season id that does not exist
- **THEN** no season's flag changes and an error is reported

### Requirement: Published seasons artifact
Publishing SHALL generate `seasons.json` alongside the other artifacts, shaped `{ activeSeason, seasons }`, where `activeSeason` is the resolved active season's name (e.g. `"26/27"`) and `seasons` is every season's name in ascending chronological order, including seasons with no games. It SHALL be uploaded, checksummed and diffed like every other artifact.

#### Scenario: Active season with no games is published
- **WHEN** seasons `SSN2526` (25 games) and `SSN2627` (0 games, `active: true`) exist and a publish runs
- **THEN** `seasons.json` is `{ "activeSeason": "26/27", "seasons": ["25/26", "26/27"] }`

#### Scenario: Changing the active season changes the artifact
- **WHEN** the active season is changed and a publish runs
- **THEN** `seasons.json`'s checksum differs from the last successful publish and it is uploaded

### Requirement: Website uses the published active season
The website SHALL read `seasons.json` and use `activeSeason` as its current season: the home page's season-leaders section and its heading SHALL show the active season, and the Stats, Team Stats and Results pages SHALL open on the active season while still offering every season in `seasons` (plus "All time"/"All") as a selectable chip. A season with no games SHALL render the page's empty state rather than falling back to another season. The website SHALL NOT hardcode any season name.

#### Scenario: New season before its first game
- **WHEN** `seasons.json` says `activeSeason: "26/27"` and `results.json` has no 26/27 games
- **THEN** the home heading reads "2026/27 season", season leaders shows an empty state, and Stats, Team Stats and Results open on 26/27 showing their empty state with a 26/27 chip selected

#### Scenario: Visitor browses a past season
- **WHEN** the active season is 26/27 and the visitor picks the 25/26 chip on the Stats page
- **THEN** the page shows 25/26 stats
