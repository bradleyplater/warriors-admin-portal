## MODIFIED Requirements

### Requirement: Roster table links to player creation, not to individual players
The system SHALL provide an "Add new player" control on `/players` that navigates to `/players/new`. Individual roster rows SHALL NOT themselves be clickable or link to another page as a whole. The only per-row navigation permitted is a dedicated edit icon within the row, which links to that player's edit route.

#### Scenario: Add new player button navigates to the create route
- **WHEN** an admin clicks "Add new player" on `/players`
- **THEN** the admin is navigated to `/players/new`

#### Scenario: Roster rows are not links
- **WHEN** the roster table renders
- **THEN** no row is clickable as a whole, and no part of a row other than its dedicated edit icon navigates to another page

#### Scenario: Edit icon navigates to that player's edit route
- **WHEN** an admin clicks the edit icon on a roster row
- **THEN** the admin is navigated to `/players/[id]/edit` for that specific player
