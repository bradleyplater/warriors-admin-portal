## ADDED Requirements

### Requirement: Unknown game id renders a 404
The system SHALL render Next.js's default not-found response when `/games/[id]` is requested for an id that does not correspond to an existing game document.

#### Scenario: Unknown game id 404s
- **WHEN** `/games/[id]` is opened for an id that does not match any game document
- **THEN** the response is a 404 not-found page, not a crash or an empty detail page

### Requirement: Games list and create-game form reflect data created after server start
The `/games` and `/games/new` pages SHALL render per request rather than being statically generated at build time, so that games, seasons, and rostered players created after the server has started are visible without a rebuild.

#### Scenario: A game created after server start appears on /games
- **WHEN** a game is created while the server is already running (e.g. against a production build)
- **THEN** that game appears in its season's section on `/games` without requiring a rebuild or restart

#### Scenario: A season or player added after server start appears in the create-game form
- **WHEN** a season or active player is added to the database while the server is already running
- **THEN** that season and player appear as selectable options on `/games/new` without requiring a rebuild or restart
