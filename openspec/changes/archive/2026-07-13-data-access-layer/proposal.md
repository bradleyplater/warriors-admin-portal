## Why

The entity schemas (KAN-13) deliberately deferred everything that needs a database round-trip — ID generation, audit timestamps, and the active-player number uniqueness check — to "the data-access layer." Nothing implements that layer yet: no code besides `seed/run.ts` touches MongoDB, and `seed/run.ts` talks to raw driver collections directly with no shared ID scheme, no audit stamping, and no indexes. Phase 2+ feature work (Players/Games CRUD) is blocked until this exists.

## What Changes

- New repository per collection (`seasons`, `team`, `players`, `games`, `publishes`) — the only code permitted to touch the MongoDB driver directly.
- Shared ID generator producing `PREFIX` + 6-digit IDs (`PLR`, `GME`, `GOL`, `PEN`, `OGL`, `OPP`, `SSN`, `PUB`), collision-safe: top-level document `_id`s retry on the natural uniqueness Mongo already enforces; embedded goal/penalty ids (`GOL`/`PEN`/`OGL`/`OPP`) are checked for uniqueness only against sibling ids already in the one `Game` document being written — no cross-document check, since nothing looks goals/penalties up by id outside their game.
- Automatic `createdAt`/`updatedAt` stamping on every create/update, applied by the repository layer — callers never set these fields (matches the `CreateInput` schemas from KAN-13, which already omit them).
- Idempotent `ensureIndexes()` that establishes the partial unique index on `{ number: 1 }` where `active: true` (players) plus the remaining indexes from `docs/03-data-model.md`. Runs unconditionally as part of the seed pipeline, decoupled from fixture insertion, so the same call also works unchanged against production during the future migration cutover.
- A typed `DuplicateShirtNumberError`, translated from the underlying MongoDB duplicate-key error, so a shirt-number collision surfaces as a catchable domain error rather than a raw driver exception.
- **Team repository exposes read/update only — no `create`.** There is exactly one `Team` document (Peterborough Warriors), created once via seed/migration; the PRD explicitly excludes multi-team support, so no code path ever creates a second one.

## Capabilities

### New Capabilities

- `data-access-layer`: repository CRUD per collection, collision-safe ID generation (top-level and embedded), automatic audit-timestamp stamping, index management, and the duplicate-shirt-number domain error.

### Modified Capabilities

_None._ `entity-schemas` already documents this boundary (`lib/schemas/player.ts` and `openspec/specs/entity-schemas/spec.md` both point here) and needs no requirement changes itself.

## Impact

- **New code**: a repository module per collection, a shared id-generation module, an `ensureIndexes()` module, and the `DuplicateShirtNumberError` type — all net-new under `lib/`.
- **Modified**: `seed/run.ts` gains an unconditional `ensureIndexes()` call ahead of its existing "skip if already seeded" check.
- **Not touched**: `seed/ids.ts` (the in-memory fixture-id helper used only at module-load time by `seed/data/*.ts`) stays exactly as is — it's intentionally local to seeding, per its own design doc, and is not the generator this change introduces.
- **Downstream unblocked**: Phase 2+ feature tickets (Players/Games CRUD) can build services on top of these repositories instead of talking to the driver directly.
