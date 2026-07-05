# Proposal: scaffold-portal-app

> Jira: [KAN-8 — Scaffold the portal application](https://bradleyplater.atlassian.net/browse/KAN-8) (epic KAN-1, Foundation & Developer Environment)

## Why

The Warriors Admin Portal exists only as planning documentation — there is no application code. Every subsequent ticket (Docker env, seed data, CI, Playwright, and all feature epics) needs a consistent, working application base to build on. This change creates that base.

## What Changes

- Create a Next.js (App Router) + TypeScript application at the repo root, per [02 — Architecture](../../../docs/02-architecture.md).
- Tailwind CSS included at scaffold time (shadcn/ui init deferred to the first real screen, KAN-15).
- Code quality tooling: ESLint + Prettier, plus a standalone type-check command; all pass on the clean scaffold.
- npm scripts: `dev`, `build`, `start`, `lint`, `format`, `typecheck`.
- Portal shell: shared layout with navigation to Players, Games, and Seasons placeholder pages; space reserved in the shell for the future publish-status area.
- `middleware.ts` with a pass-through matcher covering all portal routes (the day-one auth seam from the architecture doc).
- README gains a "Getting started" section so a fresh clone can install and run the app by following documented steps.

**Out of scope** (owned by sibling tickets): Docker/Mongo/MinIO (KAN-9), seed data (KAN-10), CI (KAN-11), Playwright (KAN-12), Zod schemas (KAN-13), repositories/DB access (KAN-14), authentication, and any real feature UI. The scaffold must run with no database available.

## Capabilities

### New Capabilities

- `portal-shell`: the running app renders a portal shell — shared navigation to Players, Games, and Seasons placeholder areas, a home page, and a pass-through middleware seam for future auth.
- `dev-tooling`: repo-level developer workflow — documented install/run steps in the README, and lint / format / type-check / production-build commands that pass on a clean checkout.

### Modified Capabilities

None — this is the first change; no existing specs.

## Impact

- **New code**: `app/` (layout, home, three placeholder pages), `middleware.ts`, config files (`package.json`, `tsconfig.json`, ESLint/Prettier/Tailwind/Next configs), `.gitignore` updates.
- **Modified**: `README.md` (adds Getting started; existing planning content preserved).
- **Preserved untouched**: `docs/`, `openspec/`, `.claude/`.
- **Dependencies**: Next.js (latest stable, 15+), React, TypeScript, Tailwind CSS, ESLint, Prettier — all dev-standard; no runtime service dependencies introduced.
- **Mechanical note**: `create-next-app` refuses to scaffold into a directory with a conflicting `README.md`, so generation happens in a temp directory and is merged into the repo root.
