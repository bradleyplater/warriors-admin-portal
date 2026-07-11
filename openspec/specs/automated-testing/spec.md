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
