## MODIFIED Requirements

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
