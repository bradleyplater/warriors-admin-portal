## ADDED Requirements

### Requirement: Seed dataset uses the target shape only
The seed dataset SHALL contain only target-shape documents as defined in `docs/03-data-model.md`: no player SHALL carry the legacy `position`, `teams`, or `stats` fields, and the team document SHALL NOT carry `players[]` or `stats[]`. The dataset SHALL include at least one inactive player with no `number`, so the numberless-inactive case is exercised everywhere seed data is used.

#### Scenario: No legacy player fields
- **WHEN** the seeded `players` collection is inspected
- **THEN** no document has a `position`, `teams`, or `stats` field

#### Scenario: No legacy team aggregates
- **WHEN** the seeded team document is inspected
- **THEN** it has no `players` or `stats` field

#### Scenario: Numberless inactive player present
- **WHEN** the seeded `players` collection is inspected
- **THEN** at least one document has `active: false` and no `number` field

## REMOVED Requirements

### Requirement: Legacy-shaped and drifted fixtures for migration testing
**Reason**: The migration is complete and the reconciliation report, additive migration, and review screens these fixtures existed to test are removed by this change. Production no longer holds legacy fields after the Step 6 cleanup.
**Migration**: None needed. The fixtures are deleted from `seed/data/` along with the legacy fields on `seed/types.ts`; the replacement requirement "Seed dataset uses the target shape only" asserts their absence.
