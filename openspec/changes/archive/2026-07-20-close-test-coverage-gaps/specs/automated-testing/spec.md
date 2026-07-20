## ADDED Requirements

### Requirement: Direct unit tests for branching pure functions
The project SHALL require a direct unit test for any exported function outside `lib/schemas/*` and `lib/repositories/*` that contains branching logic (validation-error mapping, form-data coercion, derivation, ordering, etc.), independent of any coverage that function receives indirectly through an integration or e2e test.

#### Scenario: A new branching function ships without a direct test
- **WHEN** a change adds or modifies an exported function containing branching logic outside the schema/repository layers
- **THEN** the change SHALL include a unit test exercising each branch directly, and the change is not complete until that test exists

#### Scenario: Indirect e2e coverage does not satisfy the rule
- **WHEN** a function's behavior is only exercised indirectly through an e2e test path (e.g. an ordering function only verified by asserting on-screen order)
- **THEN** that indirect coverage does not satisfy the direct-unit-test requirement for that function

### Requirement: Not-found paths get a direct test
The project SHALL require a test proving that a page implementing `notFound()` (or another explicit error branch) actually renders that error state under the triggering condition, not just its happy path.

#### Scenario: A page adds notFound() without a covering test
- **WHEN** a change adds a `notFound()` call (or other explicit error branch) to a page
- **THEN** the change SHALL include a test that requests the page under the failing condition (e.g. an unknown id) and asserts the error response, and the change is not complete until that test exists

### Requirement: Live-data pages without a dynamic segment get a freshness test
The project SHALL require a test proving that a page reading live database data, with no dynamic route segment forcing per-request rendering, reflects data created after the server has already started — not just data present at build time.

#### Scenario: A new live-data page ships without a freshness test
- **WHEN** a change adds a page that reads data from the database and has no dynamic route segment
- **THEN** the change SHALL include a test that creates data after the server is already running and asserts it is visible on that page without a rebuild, and the change is not complete until that test exists
