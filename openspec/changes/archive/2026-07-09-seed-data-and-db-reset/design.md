## Context

KAN-9 shipped `docker-compose.yml` (mongo:7 + MinIO) and `lib/mongodb.ts` (a cached `MongoClient`/`Db` getter reading `MONGODB_URI`), but deliberately deferred seed data, `mongo-seed`, `npm run db:reset`, and the local-only guard rail to this ticket. Per [05-testing-strategy.md](../../../docs/05-testing-strategy.md), local dev, integration tests, and Playwright must all read the same seed dataset rather than each maintaining its own fixtures. No Zod schema layer (KAN-13) or data-access/ID-generation layer (KAN-14) exists yet — this design deliberately stops short of both, per the scope split in the proposal.

## Goals / Non-Goals

**Goals:**
- One shared seed module, callable both as a CLI script and as an importable function, so local dev (via a Docker one-shot service), integration tests, and Playwright can all use it.
- Seeding is idempotent: it only ever writes to a database with none of the seeded collections populated.
- `npm run db:reset` drops the local database and re-seeds it in one step.
- Both seed and reset refuse to run against anything that doesn't look like a local `MONGODB_URI`, unless explicitly overridden.
- Seed data is realistic enough to exercise every position/game-type/goal-type/penalty combination called out in the AC, plus fixtures for migration testing.

**Non-Goals:**
- A shared Zod validation layer or shared ID-generation/repository utility (KAN-13/KAN-14) — this module uses its own minimal local types and ID helper.
- Any derived-stats computation (KAN-25/26/27) — seeded games carry only raw goals/penalties.
- A full legacy-database fixture set for the migration scripts themselves (KAN-29/33/34) — this ticket only seeds enough legacy-shaped/drifted data to exercise reconciliation logic in tests; the migration tickets may add their own larger fixtures later.

## Decisions

**Seed script runs via `tsx`, not precompiled JS.** The seed module is authored in TypeScript (`seed/`) and run directly with `tsx` (added as a devDependency) rather than compiled ahead of time. This lets the same source run identically from `npm run db:seed` / `npm run db:reset` on the host, from the `mongo-seed` Docker service, and from test setup code, with no separate build step to keep in sync. Alternative considered: a `tsc`-compiled `dist/seed` — rejected as unnecessary build complexity for a dev-only tool.

**Idempotency check: count all four seeded collections, skip if any are non-empty.** Before inserting, the seed function runs `Promise.all` counts on `seasons`, `team`, `players`, `games`; if any count is non-zero, it logs and exits without writing. This is stricter than checking one collection, and avoids partial-reseed if a developer's database is in a half-populated state. Alternative considered: a single `_meta.seeded` marker document — rejected because it can go stale relative to the actual collections (e.g. a developer manually clears `players` but the marker survives).

**Local-only guard rail: hostname allow-list, not a full URI parse.** Parse `MONGODB_URI` with the `URL` constructor and require the hostname to be one of `localhost`, `127.0.0.1`, or `mongo` (the Compose service's network name, used when the seed script runs *inside* the `mongo-seed` container). Anything else requires `--allow-remote` on the CLI. This is shared by both `seed` and `reset` entry points (a single `assertLocalOrAllowed(uri, argv)` helper). Alternative considered: matching against `docs/06`'s example URI string — rejected as too brittle if the port or db name differs.

**`db:reset` composes with `seed`, not a copy of it.** `npm run db:reset` runs a small script that calls `db.dropDatabase()` (after the same guard-rail check) and then calls the exact same `runSeed()` used by `db:seed`/`mongo-seed`/tests — so there is exactly one place that defines what "seeded" means.

**Local ID helper, not the shared generator.** `seed/ids.ts` exports `genId(prefix: string)` producing `PREFIX######` (6 random digits), tracking already-issued IDs in an in-memory `Set` for the duration of one seed run to avoid collisions. This is intentionally not exported outside `seed/` — KAN-14 owns the real shared generator (with DB-backed collision retry) that application code will use.

**Legacy-shaped/drifted data lives on top of target-shape documents, not as a separate fixture set.** Per [04-migration-plan.md](../../../docs/04-migration-plan.md), migration is additive — old fields are added-to, not replaced, until the cleanup phase. So "legacy-shaped" seed data means: a few players carry their target-shape fields (`positions`, `active`, `teamId`, ...) *and* the old fields (`position` string, `teams: [{teamId, number}]`, `stats: [...]`) side by side on the same document; the team document carries its identity fields plus legacy `players[]`/`stats[]` arrays populated with values that deliberately don't match what the stats engine would compute. This keeps one seed dataset that the Phase 2+ app (built against target-shape fields) can already read correctly, while still giving the migration/reconciliation tickets (KAN-34/37) realistic drift to detect. See Open Questions — flagging this interpretation for confirmation since the ticket text could also mean a separate legacy-only fixture set.

**Games/players data is hand-authored TypeScript, not generated.** `seed/data/players.ts`, `seed/data/games.ts`, `seed/data/seasons.ts` are literal arrays of objects (not procedurally generated), matching the AC's explicit combinations (every position, every goal type, etc.) precisely rather than approximating them via randomization.

## Risks / Trade-offs

- **`tsx` in the `mongo-seed` container means shipping source + `node_modules` into that one-shot container** → Acceptable; it's dev-only tooling, not a production image, and mirrors the "one-shot node script" already documented in `docs/06-local-development.md`.
- **Hostname allow-list could reject a legitimate local setup with a nonstandard host (e.g. a custom Docker network alias)** → Mitigated by `--allow-remote`; documented as the escape hatch, matching the guard rail's own stated design (a copied command should never silently wipe production, but a real local override should always be possible).
- **Hand-authored fixtures drift from `docs/06`'s narrative description over time** → Acceptable; the doc already describes the target shape at a high level, and this ticket doesn't change it, so no doc edit is needed now.
- **Bolting legacy fields onto target-shape documents (rather than a separate fixture set) could be the wrong call if KAN-34's migration script expects genuinely old-only documents** → Flagged explicitly in Open Questions for sign-off before implementation.

## Open Questions

- Confirm the "legacy-shaped documents" interpretation above (old fields added onto target-shape documents) matches what KAN-34/KAN-37 will expect, versus a fully separate legacy-only fixture set.
- Confirm `npm run db:seed` (idempotent seed only, no drop) is a wanted addition alongside `npm run db:reset`, since integration tests/Playwright need to invoke seeding without necessarily dropping first — or whether tests should import `runSeed()` directly instead of shelling out to an npm script.
