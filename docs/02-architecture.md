# 02 — Architecture

## Overview

One Next.js (App Router) full-stack application. The server talks directly to MongoDB. There is no separate API service and no separate export service.

```
┌─────────────────────────────────────────────────────────┐
│                  Warriors Admin Portal                   │
│                     (Next.js app)                        │
│                                                          │
│  UI (React server + client components)                  │
│    │                                                     │
│  Server Actions / Route Handlers                         │
│    │                                                     │
│  Service layer                                           │
│    ├── players / games / seasons services                │
│    ├── stats engine  (derives all aggregates from Game)  │
│    └── publish service (JSON generation + S3 upload)     │
│    │                                                     │
│  Repository layer (MongoDB driver)                       │
└────────┬──────────────────────────────┬─────────────────┘
         │                              │
   MongoDB (HockeyTracker)        S3 bucket / CDN
   source of truth                published JSON
                                        │
                                  Public website
                                  (reads JSON, unchanged
                                   apart from base URL)
```

## Key principles

1. **Single source of truth.** Aggregate stats are never stored as editable data. The stats engine derives them from `Game` documents on demand (and materialises them into the published JSON at publish time).
2. **Explicit publish.** Nothing reaches the website until the Publish button is pressed. The portal is free to hold half-entered games safely.
3. **Host-agnostic.** No hosting decision has been made. The app must run identically on Vercel, a VPS, or Docker — achieved by keeping all environment specifics in env vars and providing a production `Dockerfile` alongside standard `next build` output.

## Stack choices

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15+, App Router, TypeScript | Full-stack in one app per the PRD |
| DB access | Official `mongodb` driver | The schema uses custom string `_id`s (`PLR…`, `GME…`) and embedded documents that map poorly to Mongoose defaults; the driver plus explicit schemas is simpler and more predictable |
| Validation | Zod schemas shared between client and server | One definition of every entity and enum; forms and API validate identically |
| Forms/UI | React Hook Form + a component library (e.g. shadcn/ui) | Fast to build consistent CRUD screens |
| S3 | AWS SDK v3 (`@aws-sdk/client-s3`) | Standard; also works against MinIO locally |
| E2E | Playwright | See [05 — Testing Strategy](05-testing-strategy.md) |

## Layers

- **UI** — pages under `app/players`, `app/games`, `app/seasons`, plus a publish status area in the shell. Server components read via services; mutations go through server actions.
- **Server actions / route handlers** — thin: validate input with Zod, call a service, return typed results.
- **Services** — all business rules live here (roster validation, goal/assist rules, bench penalties, derivation triggers). Pure TypeScript, unit-testable without HTTP or DB where possible.
- **Stats engine** — pure functions: `(games, players) → season aggregates`, `(game) → score & periods`. No I/O; heavily unit tested. Used by the UI (live display) and the publish service (materialised output).
- **Repositories** — the only layer that touches the MongoDB driver. One repository per collection.
- **Publish service** — generates every JSON artifact from current data, compares against the last published checksums, uploads to S3, records a `Publish` document (see [03 — Data Model](03-data-model.md)), and invalidates the CDN if configured.

## The publish pipeline

1. User presses **Publish**.
2. Publish service loads all data and runs the stats engine.
3. JSON artifacts are generated to match the golden-fixture shapes captured in Phase 0.
4. Artifacts are checksummed; unchanged files are skipped, changed files uploaded to S3.
5. A `Publishes` document records when, what changed, and the checksums.
6. CDN invalidation for changed paths (if a CDN is in front of the bucket).

**Unpublished-changes indicator:** every write stamps `updatedAt` on the affected document. The indicator shows when `max(updatedAt across collections) > lastPublish.completedAt`. This is cheap (one indexed query per collection) and cannot false-negative.

## Configuration

All environment-specific values are env vars — switching from local Docker to production is exactly the connection-string swap the PRD asks for:

| Variable | Local (Docker) | Production |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/HockeyTracker` | Atlas/production connection string |
| `S3_ENDPOINT` | MinIO `http://localhost:9000` | real AWS endpoint (unset = default) |
| `S3_BUCKET` | `warriors-local` | production bucket |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | MinIO defaults | IAM credentials |
| `CDN_INVALIDATION` | disabled | CloudFront distribution ID (optional) |

## Auth seam (future)

MVP has no authentication (D4). To keep the later addition trivial:

- All mutations flow through server actions in one directory with a single shared `requireUser()` no-op guard — implementing auth later means implementing that one function (e.g. with NextAuth/Auth.js) and adding a login page.
- `middleware.ts` exists from day one with a pass-through matcher covering all portal routes.
- No data model changes will be needed: a `Users` collection can be added independently.

## Retired components

- **`ApiKeys` collection** — belongs to the old export system; unused by the portal and deleted at decommission time ([07 — Build Roadmap](07-build-roadmap.md), Phase 7).
- **Both existing admin services** — kept running in parallel (read-only ideally) until the parity checks in the migration plan pass, then switched off.
