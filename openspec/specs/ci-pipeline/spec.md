## Purpose

Defines the GitHub Actions CI pipeline that automatically validates every push and pull request by running lint, type-check, and the project's unit, integration, and e2e test commands (see the `automated-testing` capability) against services provided by the project's `docker-compose.yml`.

## Requirements

### Requirement: Automatic trigger on push and pull request
The project SHALL provide a GitHub Actions workflow that runs automatically on every push and on every pull request.

#### Scenario: Push triggers the pipeline
- **WHEN** a commit is pushed to any branch with an open workflow trigger
- **THEN** the CI workflow starts automatically

#### Scenario: Pull request triggers the pipeline
- **WHEN** a pull request is opened or updated
- **THEN** the CI workflow starts automatically

### Requirement: All five stages run in order
The workflow SHALL run lint, type-check, unit tests, integration tests, and e2e tests, in that order (lint + typecheck → unit → integration → e2e), with each stage depending on the previous stage succeeding.

#### Scenario: All stages run on a clean change
- **WHEN** the workflow runs against a change that passes every check
- **THEN** lint, typecheck, unit, integration, and e2e all execute and report success

#### Scenario: A failing stage blocks later stages
- **WHEN** an earlier stage (e.g. lint or unit) fails
- **THEN** later stages (e.g. integration, e2e) do not run, and the workflow run is reported as failed

### Requirement: Services reused from docker-compose.yml
The integration and e2e stages SHALL start their required services (MongoDB, MinIO, seeding, bucket creation) via the project's existing `docker-compose.yml` rather than a separately maintained service definition.

#### Scenario: Integration stage uses the compose stack
- **WHEN** the integration stage runs
- **THEN** it starts services via `docker compose up -d --wait` against the repository's `docker-compose.yml` before running tests

### Requirement: E2e artifacts published on every run
The workflow SHALL upload the Playwright video recordings, traces, and HTML report as downloadable workflow artifacts on every run, whether the e2e stage passes or fails.

#### Scenario: Artifacts available after a run
- **WHEN** the e2e stage completes, whether passing or failing
- **THEN** the run's videos, traces, and HTML report are available for download from the workflow run

### Requirement: Green run demonstrated against the scaffold and seeded environment
A full pipeline run SHALL be demonstrated passing against the current scaffold using the project's seeded environment, showing lint, typecheck, unit, integration, and e2e all succeeding together in one run.

#### Scenario: Demonstrated green run
- **WHEN** the workflow is run on a pull request containing this change
- **THEN** all five stages succeed in that single run
