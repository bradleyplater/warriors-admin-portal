## MODIFIED Requirements

### Requirement: Placeholder area pages
The portal SHALL serve a placeholder page at `/seasons`. The placeholder MUST identify its area by name and MUST NOT present fake data or non-functional controls. `/players` is no longer a placeholder — it serves the player roster list (see the `roster-list` capability), `/players/new` serves the create-player form and `/players/[id]` serves the player profile (see the `player-management` and `player-profile` capabilities). `/games` is no longer a placeholder — it serves the season-grouped games list, `/games/new` serves the create-game form, and `/games/[id]` serves the game detail page (see the `game-management` capability).

#### Scenario: Visiting an area directly by URL
- **WHEN** a user opens `/seasons` directly in the browser
- **THEN** a placeholder page for that area renders inside the shared shell

#### Scenario: Players is no longer a placeholder
- **WHEN** a user opens `/players` directly in the browser
- **THEN** the player roster list renders inside the shared shell, not a placeholder message

#### Scenario: Games is no longer a placeholder
- **WHEN** a user opens `/games` directly in the browser
- **THEN** the season-grouped games list renders inside the shared shell, not a placeholder message
