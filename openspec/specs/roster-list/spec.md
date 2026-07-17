# roster-list Specification

## Purpose
TBD - created by archiving change view-player-roster-list. Update Purpose after archive.
## Requirements
### Requirement: Roster table shows every player grouped by active status
The system SHALL render, at `/players`, a table of every player on the team, grouped into an "Active" section and an "Inactive" section, with each row showing at minimum the player's shirt number, name, position(s), and nickname if set.

#### Scenario: All players render, not a placeholder
- **WHEN** an admin opens `/players`
- **THEN** every existing player renders in the table, with no placeholder or "coming soon" message

#### Scenario: Row shows required fields
- **WHEN** the roster table renders a player's row
- **THEN** the row shows that player's shirt number, name, and position(s), and shows the nickname if one is set

#### Scenario: Active and inactive players are grouped separately
- **WHEN** the roster table renders
- **THEN** players with `active: true` appear in an "Active" section and players with `active: false` appear in a separate "Inactive" section, distinct from each other

#### Scenario: Rows are ordered by shirt number
- **WHEN** either section of the roster table renders more than one player
- **THEN** the rows within that section are ordered by shirt number ascending

### Requirement: Roster list updates without a manual reload
The system SHALL reflect a newly created player in the `/players` roster table as part of normal navigation back to `/players`, without requiring the admin to manually refresh the page.

#### Scenario: Newly created player appears after redirect
- **WHEN** a player is successfully created via `/players/new`
- **THEN** the admin is returned to `/players` and the new player appears in the correct (Active or Inactive) section of the roster table without a manual page reload

### Requirement: Roster table links to player creation, profiles, and editing
The system SHALL provide an "Add new player" control on `/players` that navigates to `/players/new`. Individual roster rows SHALL be whole-row links to that player's profile page at `/players/[id]`. Each row SHALL additionally provide a dedicated edit icon that links to that player's edit route at `/players/[id]/edit`, independently of the row's own link.

#### Scenario: Add new player button navigates to the create route
- **WHEN** an admin clicks "Add new player" on `/players`
- **THEN** the admin is navigated to `/players/new`

#### Scenario: Clicking a roster row navigates to that player's profile
- **WHEN** an admin clicks anywhere on a roster row other than the dedicated edit icon
- **THEN** the admin is navigated to `/players/[id]` for that specific player

#### Scenario: Edit icon navigates to that player's edit route
- **WHEN** an admin clicks the edit icon on a roster row
- **THEN** the admin is navigated to `/players/[id]/edit` for that specific player, not to the profile page
