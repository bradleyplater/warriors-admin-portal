## Purpose

Defines the automated test commands (unit, integration, e2e) that the project provides and what each is required to cover. These commands are the building blocks the CI pipeline runs; see the `ci-pipeline` capability for how they are orchestrated together.

## Requirements

### Requirement: Unit test command
The project SHALL provide an `npm run test:unit` command (Vitest) that runs without requiring any Docker services to be running, and SHALL include a real test of `seed/guard.ts`'s `assertLocalOrAllowed()` covering its `--allow-remote` override, invalid-URI, disallowed-host, and allowed-host branches.

#### Scenario: Unit tests pass with no services running
- **WHEN** `npm run test:unit` is run on a clean checkout with no Docker services started
- **THEN** it completes successfully, including the `assertLocalOrAllowed()` tests

### Requirement: Integration test command
The project SHALL provide an `npm run test:integration` command (Vitest) that runs against the real MongoDB and MinIO started by `docker-compose.yml`, and SHALL include a real test of `GET /api/health` asserting a `200` response with `{ mongo: "ok", s3: "ok" }` when both services are healthy and seeded.

#### Scenario: Integration tests pass against the local Docker stack
- **WHEN** `docker compose up -d --wait` has completed successfully and `npm run test:integration` is then run
- **THEN** it completes successfully, including the `GET /api/health` test asserting both services report `ok`

### Requirement: End-to-end test command
The project SHALL provide an `npm run test:e2e` command (Playwright) configured with `video: 'on'` and `trace: 'retain-on-failure'`, running against a production build (`next build` + `next start`) with the Docker services up, and SHALL include a real smoke test that loads the portal shell and navigates to the Players, Games, and Seasons pages.

#### Scenario: E2e smoke test passes against the built app
- **WHEN** the Docker services are running, the app is built and started, and `npm run test:e2e` is run
- **THEN** it completes successfully, including navigation to `/players`, `/games`, and `/seasons` each rendering without error

#### Scenario: Every e2e run produces watchable artifacts
- **WHEN** `npm run test:e2e` completes, whether passing or failing
- **THEN** a video recording, trace, and HTML report are produced for the run

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
