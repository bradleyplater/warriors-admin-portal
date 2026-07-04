# 07 — Build Roadmap

Phased so that every phase ends with something verifiable, and the risky/destructive work (migration, cutover) happens last, against a system already proven on seeded data.

## Phase 0 — Contract capture & safety net

- Full `mongodump` backup of production.
- Copy the current website JSON files out of the website repo into `fixtures/golden/` — this defines the publish contract.
- Confirm on a staging copy that the old system tolerates the additive fields from migration Step 1.

**Exit:** golden fixtures committed; backup stored; additive-safety confirmed.

## Phase 1 — Scaffold

- Next.js + TypeScript app, repo tooling (lint, typecheck), `docker-compose.yml` (Mongo + MinIO), seed module, CI pipeline skeleton.
- Zod schemas for the full target data model ([03](03-data-model.md)), repositories, ID generation.

**Exit:** `docker compose up && npm run dev` shows a shell app reading seeded data; CI green.

## Phase 2 — Players area

- Player list/create/edit: names, number (1–99 + uniqueness), multi-select positions, active toggle, nickname, image URL.
- Read-only season stats display wired to the stats engine (against seeded games).

**Exit:** player journeys pass in Playwright.

## Phase 3 — Games area

- Game create (date, season, opponent, type, location, roster) and edit.
- Goals (scorer, ≤2 assists, time, type), penalties (incl. `BENCH`), opponent goals/penalties by name, netminder, Player of the Game, Warrior of the Game.
- Derived score + period line on the game page.
- Blocked-removal rules for rostered players with references.

**Exit:** the full game-entry Playwright journey (create → stats verified everywhere) passes.

## Phase 4 — Stats engine hardening

- Complete player/team/season aggregation with the full unit suite (boundaries, shootout, bench PIMs).
- Season management (create new season).

**Exit:** stats engine test suite complete; computed views shown across the portal.

## Phase 5 — Publish pipeline

- JSON artifact generation matching the golden fixtures (unit-tested for byte parity on seeded equivalents).
- S3 upload + checksum skip + `Publishes` log + CDN invalidation hook, all working against MinIO locally.
- Unpublished-changes indicator.

**Exit:** publish Playwright journey passes; artifact diff vs golden fixtures reviewed.

## Phase 6 — Migration & cutover ([04 — Migration Plan](04-migration-plan.md))

- Migration scripts (additive, reconcile, cleanup) built and proven on seeded legacy-shaped data in CI.
- Migration Review screens (active checklist, renumbering).
- Execute against production: additive → reviews → reconciliation sign-off → cutover → publish parity diff → website switched to S3/CDN.

**Exit:** portal is the write path; website reads from S3; old fields frozen; old services idle but available for rollback.

## Phase 7 — Bedding-in & decommission

- Agreed bedding-in period using the portal for real games.
- Cleanup migration drops frozen legacy fields; `ApiKeys` deleted; old services switched off.
- (Optional, deferred items become candidates here: auth, image upload flow, hosting hardening.)

**Exit:** one system. The PRD's goal.

## Deferred decisions to revisit

| Decision | Revisit at |
|---|---|
| Production hosting target | Before Phase 6 cutover |
| S3 bucket/CDN specifics | Phase 5 |
| Auth | Post-MVP (seam ready — [02](02-architecture.md#auth-seam-future)) |
| Penalty-code labels marked *(confirm)* | Phase 3 UI build |
