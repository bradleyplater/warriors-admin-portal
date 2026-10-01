## MODIFIED Requirements

### Requirement: Shared shell with area navigation
The portal SHALL render a shared shell layout on every page, containing navigation links to the Players, Games, Opponents, and Seasons areas.

#### Scenario: Navigation visible on every page
- **WHEN** a user visits any portal page (home, Players, Games, Opponents, or Seasons)
- **THEN** the shell navigation with links to Players, Games, Opponents, and Seasons is visible

#### Scenario: Navigating between areas
- **WHEN** the user clicks an area link in the navigation
- **THEN** the portal navigates to that area's page without a full-page error
