## MODIFIED Requirements

### Requirement: Placeholder area pages
The portal SHALL serve placeholder pages at `/games` and `/seasons`. Each placeholder MUST identify its area by name and MUST NOT present fake data or non-functional controls. `/players` is no longer a placeholder — it serves the player roster list (see the `roster-list` capability), and `/players/new` serves the create-player form (see the `player-management` capability).

#### Scenario: Visiting an area directly by URL
- **WHEN** a user opens `/games` or `/seasons` directly in the browser
- **THEN** a placeholder page for that area renders inside the shared shell

#### Scenario: Players is no longer a placeholder
- **WHEN** a user opens `/players` directly in the browser
- **THEN** the player roster list renders inside the shared shell, not a placeholder message
