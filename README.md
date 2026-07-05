# Warriors Admin Portal

A single Next.js full-stack application for managing the Peterborough Warriors ice hockey data, replacing the two existing admin/export services. MongoDB remains the source of truth; the portal publishes the JSON files the public website reads to S3/CDN at the press of a **Publish** button.

## Why this exists

The current setup uses two separate services to manage data and export JSON files that are committed into the website repo. It is clunky and error prone — analysis of the live database found season-stat drift in three of four seasons caused by the same data being hand-maintained in multiple places. This portal eliminates that class of bug by making game records the single source of truth and computing all aggregate stats from them.

## Getting started

Prerequisites: Node.js (version pinned in [.nvmrc](.nvmrc); `nvm use` if you use nvm) and npm.

```bash
npm install
npm run dev   # http://localhost:3000
```

This runs the portal shell only — no database or object storage is required yet. Docker services (MongoDB, MinIO) and seed data arrive with [KAN-9](docs/06-local-development.md) and KAN-10; once those land, `docker compose up -d` will provide the full local stack described there.

Other scripts:

| Command | Does |
|---|---|
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier write / verify |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

## Planning documents

| Doc | Contents |
|---|---|
| [01 — Product Requirements](docs/01-product-requirements.md) | Features, scope, decisions made, non-goals, open questions |
| [02 — Architecture](docs/02-architecture.md) | App structure, publish pipeline, configuration, auth seam |
| [03 — Data Model](docs/03-data-model.md) | Target MongoDB schema, enums, validation rules, derived stats |
| [04 — Migration Plan](docs/04-migration-plan.md) | How the existing data moves to the new shape without corruption |
| [05 — Testing Strategy](docs/05-testing-strategy.md) | Unit, integration, and Playwright E2E approach |
| [06 — Local Development](docs/06-local-development.md) | Docker setup, seeding, switching connection strings |
| [07 — Build Roadmap](docs/07-build-roadmap.md) | Phased delivery plan from scaffold to decommissioning the old services |

## Key decisions (agreed 2026-07-04)

1. **Game records are the single source of truth.** Player and team season stats are computed, never hand-edited. Migration includes a reconciliation report signed off before cutover.
2. **Publishing is explicit.** A Publish button regenerates the website JSON and uploads it to S3/CDN; an indicator shows unpublished changes. Half-entered games never go live.
3. **JSON moves from the website repo to S3/CDN.** One-time website change to point at the new location; the JSON shapes themselves are preserved.
4. **Host-agnostic build**, hosting decision deferred. **No auth in MVP**, with a clean seam to add it later.
5. **Playwright** for E2E testing, with UI mode and recorded videos.
6. Schema changes: multi-select positions, `active` flag, strict 1–99 shirt numbers, single nickname, optional S3 image URL, game types CHALLENGE/BOTBC/LLIHC (NIHC read-only historical), score and periods fully derived from goal times.

## Current database (as analysed 2026-07-04)

Database `HockeyTracker`: `Seasons` (4), `Player` (84), `Team` (1), `Game` (85), `ApiKeys` (legacy, to be retired). See [03 — Data Model](docs/03-data-model.md) for the target shape and [04 — Migration Plan](docs/04-migration-plan.md) for how we get there.
