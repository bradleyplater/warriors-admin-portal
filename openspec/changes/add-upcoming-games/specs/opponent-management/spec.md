## MODIFIED Requirements

### Requirement: Referenced opponents cannot be deleted
The system SHALL allow deleting an opponent from its edit page only when no game and no upcoming game references it. When nothing references it, the opponent document SHALL be deleted and its logo object (if any) removed from S3. When one or more games or upcoming games reference it, deletion SHALL be refused with a message stating how many games and how many upcoming games reference it.

#### Scenario: Deleting an unreferenced opponent
- **WHEN** an admin deletes an opponent that no game and no upcoming game references
- **THEN** the opponent document is removed, its logo object is deleted from S3, and the admin is redirected to `/opponents`

#### Scenario: Deleting a referenced opponent is blocked
- **WHEN** an admin tries to delete an opponent referenced by 3 games
- **THEN** the opponent is not deleted, its logo is not deleted, and the page shows that it is used by 3 games

#### Scenario: Deleting an opponent with only upcoming games is blocked
- **WHEN** an admin tries to delete an opponent referenced by no game but by 1 upcoming game
- **THEN** the opponent is not deleted, its logo is not deleted, and the page shows that it is used by 1 upcoming game
