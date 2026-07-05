# dev-tooling

## Purpose

Defines the developer tooling and scripts (setup, lint, format, type-check, build) that keep the Warriors Admin Portal scaffold consistent and easy to onboard into.

## Requirements

### Requirement: Documented setup from a fresh clone
The repository README SHALL contain a "Getting started" section whose steps take a fresh clone to a running local dev server, using only npm and a pinned Node version. The Node version MUST be pinned via `engines` in `package.json` and an `.nvmrc`.

#### Scenario: Fresh clone to running app
- **WHEN** a developer on a fresh clone follows the README's getting-started steps
- **THEN** dependencies install and the dev server starts, serving the portal shell locally

### Requirement: Lint command
The project SHALL provide an `npm run lint` command (ESLint, with Prettier conflicts disabled via `eslint-config-prettier`) that exits successfully on the clean scaffold.

#### Scenario: Lint on a clean checkout
- **WHEN** `npm run lint` is run on a clean checkout
- **THEN** it completes with no errors

### Requirement: Format commands
The project SHALL provide `npm run format` (write) and `npm run format:check` (verify) commands backed by Prettier, and the clean scaffold MUST satisfy `format:check`.

#### Scenario: Format check on a clean checkout
- **WHEN** `npm run format:check` is run on a clean checkout
- **THEN** it completes reporting no files needing reformatting

### Requirement: Type-check command
The project SHALL provide an `npm run typecheck` command (`tsc --noEmit`, strict mode) that exits successfully on the clean scaffold, independently of the build.

#### Scenario: Type-check on a clean checkout
- **WHEN** `npm run typecheck` is run on a clean checkout
- **THEN** it completes with no type errors

### Requirement: Production build
The project SHALL provide an `npm run build` command that produces a production build of the portal without errors, with no external services available.

#### Scenario: Production build on a clean checkout
- **WHEN** `npm run build` is run on a clean checkout with no services running
- **THEN** the build completes successfully
