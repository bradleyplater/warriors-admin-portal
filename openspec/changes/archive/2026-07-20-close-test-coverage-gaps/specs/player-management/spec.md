## ADDED Requirements

### Requirement: Unknown player id on the edit form renders a 404
The system SHALL render Next.js's default not-found response when `/players/[id]/edit` is requested for an id that does not correspond to an existing player document.

#### Scenario: Unknown player id 404s on the edit form
- **WHEN** `/players/[id]/edit` is opened for an id that does not match any player document
- **THEN** the response is a 404 not-found page, not a crash or an empty edit form
