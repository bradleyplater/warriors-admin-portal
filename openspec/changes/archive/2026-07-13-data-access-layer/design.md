## Context

`docs/02-architecture.md` names the layer this change builds: "Repositories — the only layer that touches the MongoDB driver. One repository per collection." Nothing implements it yet. Today only `seed/run.ts` talks to Mongo, directly against raw `db.collection<T>(...)` handles, with no shared ID scheme, no audit stamping, and no indexes created anywhere in the codebase.

`lib/schemas/*` (KAN-13, merged) already defines Zod schemas per entity with `CreateInput` variants that omit `_id`, `createdAt`, and `updatedAt` — and both `lib/schemas/player.ts` and `openspec/specs/entity-schemas/spec.md` explicitly name this change ("KAN-14") as the owner of number-uniqueness enforcement, ID generation, and audit timestamps. `seed/ids.ts` is an intentionally local, in-memory-only ID helper used solely to generate the hardcoded fixture data in `seed/data/*.ts` at module-load time; its own design doc says outright "KAN-14 owns the real shared generator." This change is that generator, plus the repositories and index management around it — no changes to `seed/ids.ts` or the fixture files are needed.

## Goals / Non-Goals

**Goals:**
- One repository per collection (`seasons`, `team`, `players`, `games`, `publishes`); nothing else in the app touches the MongoDB driver.
- Collision-safe ID generation for both top-level document `_id`s and the embedded goal/penalty ids inside a `Game` document.
- Automatic `createdAt`/`updatedAt` stamping on every write, driven entirely by the repository layer.
- The active-player unique-number constraint enforced at the database level via an idempotent, unconditional index-creation step.
- A typed, catchable error for shirt-number collisions, distinct from generic driver errors.
- Integration tests exercising CRUD and both collision paths against a real local MongoDB.

**Non-Goals:**
- Domain/business validation beyond what `lib/schemas/*` already checks (roster membership, blocked removal of a referenced player, goal/assist rules) — that's the service layer, later phases.
- A `create` operation for `Team` — there is exactly one Team document, created once via seed/migration; the PRD excludes multi-team support, so no path ever creates a second one.
- Global uniqueness for embedded `GOL`/`PEN`/`OGL`/`OPP` ids across every `Game` — nothing in the app looks a goal or penalty up by id outside the game it belongs to, so uniqueness is scoped to the one document being written.
- Auth/access control (no auth in MVP) and the stats engine / publish pipeline (separate later phases).

## Decisions

**Repository per collection, not a generic `Repository<T>` base class, but shared internal helpers.** `Team` has no `create`, and `Game`'s embedded-id generation takes a different shape (in-memory, sibling-array-scoped) than the other four collections' top-level `_id` generation (DB-backed retry-on-collision). Forcing all five behind one generic interface would mean immediately special-casing it. Instead, each collection gets its own thin repository module, and the actual duplicated logic — id generation and audit stamping — lives in small shared internal helpers those modules call:
- `lib/repositories/internal/ids.ts` — `generateTopLevelId(collection, prefix)`: generates a candidate id, attempts the insert, and on an `_id`-index duplicate-key error regenerates and retries (bounded); and `generateEmbeddedId(prefix, existingIds)`: pure, synchronous, no DB call — generates a candidate and retries against the in-memory set of sibling ids already in the `Game` document being written.
- `lib/repositories/internal/audit.ts` — `stampCreate()` returns `{ createdAt, updatedAt }` both set to now; `stampUpdate()` returns `{ updatedAt }` set to now. Repository `create`/`update` methods apply these and ignore any audit fields a caller might pass, since `CreateInput` schemas already omit them.
- `lib/repositories/internal/indexes.ts` — `ensureIndexes(db)`: idempotent, calls `createIndex` for every index in `docs/03-data-model.md`'s Indexes section, including the partial unique index `{ number: 1 }` where `{ active: true }` on `players`. `createIndex` is a no-op when an identical index already exists, so repeated calls are safe.
- `lib/repositories/internal/errors.ts` — `DuplicateShirtNumberError`, a minimal `class DuplicateShirtNumberError extends Error` (no existing error-class convention in this codebase to follow — this establishes it, deliberately kept minimal rather than building a hierarchy for a single error type).

This mirrors `lib/schemas/`'s layout (a barrel `index.ts` plus one file per entity).

**Distinguishing the two causes of a MongoDB duplicate-key error (E11000).** Both the `_id`-collision retry path and the shirt-number violation raise the same error code from the driver. The `players` repository's write path must inspect the error to tell them apart — the `mongodb` driver's `MongoServerError` carries `keyPattern`/`keyValue` identifying which index was violated. If the violated index is `_id`, the id-generation retry handles it silently (never reaches the repository's public write method as an error). If it's the `number` partial unique index, the repository throws `DuplicateShirtNumberError` instead of letting the raw driver error propagate.

**`ensureIndexes()` runs unconditionally inside the seed pipeline, decoupled from fixture insertion.** `seed/run.ts`'s `runSeed()` currently early-returns before inserting fixtures if the collections are already non-empty. `ensureIndexes()` is called before that check (or independent of it), every time `runSeed()` runs, so it: (a) always establishes the index on a fresh local database, and (b) is reusable, unchanged, during the future production migration cutover — where `seed/guard.ts`'s `--allow-remote` flag permits pointing at production, but the existing document-count check must keep fixture-insertion from ever running there.

**Season ids are deterministic, not randomly generated — the top-level id generator does not apply to them.** `lib/schemas/season.ts` (already merged) enforces `_id` as `SSN` + exactly 4 digits, derived from and cross-checked against `name` (`"25/26"` → `"SSN2526"`), unlike `PLR`/`GME`/`GOL`/`PEN`/`OGL`/`OPP`/`PUB`'s random 6-digit suffixes. A season's id is not collision-prone in the way a random id is: two seasons colliding on id means someone tried to create the same season twice, which is a genuine "already exists" condition, not something to paper over by generating a different random id. `createSeason` therefore derives `_id` directly from the input `name` and performs a plain insert; a duplicate-key error on `_id` is surfaced as a "season already exists" error, not retried. (`docs/03-data-model.md` names both formats side by side — `SSN####` alongside `PLR######`/`GME######` — but its prose describing "new IDs use the same scheme" doesn't call out this exception; the merged `SeasonSchema` is the authority here.)

**Bounded retry, not unbounded, for id-generation collisions.** Both `generateTopLevelId` and `generateEmbeddedId` cap retries (proposed: 10 attempts) and throw a clear internal error if exhausted, rather than looping forever. At 6 random digits (900,000 usable combinations per prefix) and the tiny data volumes this app operates at, exhausting 10 attempts is not expected to happen in practice — the cap exists as a safety backstop, not because collisions are likely.

## Risks / Trade-offs

- **[Risk]** Telling apart the two E11000 causes depends on the `mongodb` driver's specific error shape (`keyPattern`), which could change across driver versions → **Mitigation**: cover both branches with an integration test that deliberately forces each kind of collision (a pre-existing `_id` and a pre-existing active `number`), so a driver upgrade that changes the error shape fails the suite immediately instead of silently misrouting a shirt-number collision into an unbounded retry loop or vice versa.
- **[Trade-off]** No generic `Repository<T>` base class means each of the five repository modules repeats its own CRUD method signatures → accepted; the actual duplication (id generation, audit stamping) is already factored into shared helpers, and `Team`/`Game` already need different shapes than the others, so a shared base class would need exceptions from day one.
- **[Trade-off]** Index creation lives in the seed pipeline rather than running lazily on first DB connection → accepted per product decision; `docker-compose.yml`'s `mongo-seed` service already runs on every `docker compose up`, so in normal local development the index exists before the app is ever used. A developer who bypasses Docker entirely and never runs `db:seed` would be missing the index — considered acceptable since that's already an unsupported local setup today.

## Migration Plan

No production data exists yet, so this change ships as pure infrastructure: merging it and running `docker compose up` (or `npm run db:seed`) creates the index on the local database via the existing seed pipeline. Production index creation happens later, at the Phase 6 migration cutover ([04 — Migration Plan](../../../docs/04-migration-plan.md)), by invoking the same exported `ensureIndexes()` against production with `--allow-remote` — no new migration mechanism is introduced here.

Rollback is a plain revert: creating a partial unique index is additive and safe to drop if this change needs to be undone.

## Open Questions

- Exact retry cap for id generation (proposed 10) — cheap to tune during implementation if it proves too tight or too loose.
- The precise field(s) on the driver's `MongoServerError` to key off when distinguishing `_id` vs `number`-index violations (`keyPattern` vs parsing the index name from `errmsg`) — to be confirmed against the actual `mongodb@^7` error shape while wiring up the integration test in the Risks section above, not a blocker to starting implementation.
