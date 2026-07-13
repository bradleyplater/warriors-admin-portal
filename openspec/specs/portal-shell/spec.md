# portal-shell

## Purpose

Defines the shared shell layout and top-level pages of the Warriors Admin Portal, providing navigation across the Players, Games, and Seasons areas and a seam for future authentication.
## Requirements
### Requirement: Shared shell with area navigation
The portal SHALL render a shared shell layout on every page, containing navigation links to the Players, Games, and Seasons areas.

#### Scenario: Navigation visible on every page
- **WHEN** a user visits any portal page (home, Players, Games, or Seasons)
- **THEN** the shell navigation with links to Players, Games, and Seasons is visible

#### Scenario: Navigating between areas
- **WHEN** the user clicks an area link in the navigation
- **THEN** the portal navigates to that area's page without a full-page error

### Requirement: Placeholder area pages
The portal SHALL serve placeholder pages at `/games` and `/seasons`. Each placeholder MUST identify its area by name and MUST NOT present fake data or non-functional controls. `/players` is no longer a placeholder — it serves the create-player form and minimal player list (see the `player-management` capability).

#### Scenario: Visiting an area directly by URL
- **WHEN** a user opens `/games` or `/seasons` directly in the browser
- **THEN** a placeholder page for that area renders inside the shared shell

#### Scenario: Players is no longer a placeholder
- **WHEN** a user opens `/players` directly in the browser
- **THEN** the create-player form and player list render inside the shared shell, not a placeholder message

### Requirement: Home page
The portal SHALL render a landing page at `/` inside the shared shell, identifying the application as the Warriors Admin Portal.

#### Scenario: Opening the portal root
- **WHEN** a user opens `/`
- **THEN** the landing page renders with the shell navigation visible

### Requirement: Pass-through proxy seam
The application SHALL include a `proxy.ts` (Next.js 16's file convention for the former `middleware.ts`) whose matcher covers all portal routes and which forwards every request unchanged, so that authentication can later be added by implementing this single file.

#### Scenario: Requests pass through unchanged
- **WHEN** any portal route is requested
- **THEN** the proxy forwards the request without redirects, rewrites, or blocking

### Requirement: Runs without backing services
The portal shell SHALL start and render all of its pages with no database, object storage, or other external service available.

#### Scenario: Dev server with no services running
- **WHEN** the dev server is started on a machine with no MongoDB or S3-compatible service running
- **THEN** the home, Players, Games, and Seasons pages all render without error

