## 1. Setup

- [x] 1.1 Create `lib/repositories/` module structure with an `internal/` subfolder, mirroring `lib/schemas/`'s layout (barrel `index.ts` plus one file per collection)
- [x] 1.2 Add `lib/repositories/internal/errors.ts` with `DuplicateShirtNumberError extends Error`

## 2. Shared internals: ID generation

- [x] 2.1 Implement `generateTopLevelId(collection, prefix)` in `lib/repositories/internal/ids.ts`: generate a `PREFIX` + 6-digit candidate, attempt the write, and on an `_id`-index duplicate-key error regenerate and retry up to a bounded attempt limit (propose 10), throwing a clear internal error if exhausted
- [x] 2.2 Implement `generateEmbeddedId(prefix, existingIds)` in the same file: pure, synchronous, no DB call — generate a candidate and retry against the supplied in-memory set of sibling ids until non-colliding, bounded the same way as 2.1
- [x] 2.3 Unit test both generators: correct `PREFIX######` format, retry-on-collision behavior, and the bounded-retry-exhausted error path (mock the collision instead of relying on real randomness)

## 3. Shared internals: audit timestamps

- [x] 3.1 Implement `stampCreate()` and `stampUpdate()` in `lib/repositories/internal/audit.ts`, returning `{ createdAt, updatedAt }` and `{ updatedAt }` respectively, both using the current time
- [x] 3.2 Unit test that `stampCreate()` sets both fields and `stampUpdate()` sets only `updatedAt`

## 4. Shared internals: indexes

- [x] 4.1 Implement `ensureIndexes(db)` in `lib/repositories/internal/indexes.ts`, creating every index listed in `docs/03-data-model.md`'s Indexes section, including the partial unique index `{ number: 1 }` where `{ active: true }` on `players`
- [x] 4.2 Confirm `createIndex` calls are idempotent (safe to call repeatedly with identical specs) and add a unit or integration test asserting a second call succeeds without error
- [x] 4.3 Wire `ensureIndexes()` into `seed/run.ts`'s `runSeed()`, called unconditionally before the existing "skip if already seeded" document-count check, so it runs regardless of whether fixtures get inserted
- [x] 4.4 Export `ensureIndexes()` from the repositories barrel so it is reusable, unchanged, by the future production migration step (Phase 6)

## 5. Season, Team, and Publishes repositories

- [x] 5.1 Implement `lib/repositories/seasons.ts`: `create`, `read` (by id), `list` — no `update`, since a season's only field (`name`) is fixed 1:1 with its derived `_id` at creation and the PRD treats seasons as create-once/picker-only. `create` derives `_id` deterministically from `name` (`SSN` + digits, per `lib/schemas/season.ts`'s existing format) instead of `generateTopLevelId`, stamps via `stampCreate`, and raises a "season already exists" error (not a retry) if that id already exists
- [x] 5.2 Implement `lib/repositories/team.ts`: `read`, `update` only — no `create`, per the design decision that there is exactly one Team document
- [x] 5.3 Implement `lib/repositories/publishes.ts`: `create`, `read`, `list` (publishes are append-only; no `update`/`delete` needed per `docs/03-data-model.md`)
- [x] 5.4 Validate inputs/outputs against the corresponding `lib/schemas/*` Zod schemas at the repository boundary

## 6. Player repository

- [x] 6.1 Implement `lib/repositories/players.ts`: `create`, `read`, `update`, `delete`, `list`, using `generateTopLevelId`/`stampCreate`/`stampUpdate`
- [x] 6.2 On write, catch MongoDB duplicate-key errors and inspect `keyPattern`/index name to distinguish the `_id` index (handled transparently by `generateTopLevelId`'s retry) from the `number` partial unique index
- [x] 6.3 On a `number`-index violation, throw `DuplicateShirtNumberError` instead of letting the raw `MongoServerError` propagate
- [x] 6.4 Validate inputs/outputs against `lib/schemas/player.ts`'s schemas at the repository boundary

## 7. Game repository

- [x] 7.1 Implement `lib/repositories/games.ts`: `create`, `read`, `update`, `delete`, `list`, using `generateTopLevelId`/`stampCreate`/`stampUpdate` for the game document itself
- [x] 7.2 When adding entries to `team.goals`, `team.penalties`, `opponentTeam.goals`, or `opponentTeam.penalties`, use `generateEmbeddedId` with that document's current sibling ids for the relevant array (`GOL`/`PEN`/`OGL`/`OPP` respectively) — exposed as `addGoal`/`addPenalty`/`addOpponentGoal`/`addOpponentPenalty`
- [x] 7.3 Validate inputs/outputs against `lib/schemas/game.ts`'s schemas at the repository boundary

## 8. Integration tests

- [x] 8.1 Add `tests/integration/repositories/` following the existing pattern in `tests/integration/setup.ts` / `health.test.ts`, run via `npm run test:integration` against the real local Docker MongoDB
- [x] 8.2 CRUD test per repository (create/read/update/delete for `players`, `games`; create/read/list for `publishes`; create/read/list only for `seasons`; read/update only for `team`), asserting audit timestamps are stamped correctly on create and update
- [x] 8.3 Top-level id-collision test: pre-insert a document with a known id, force the generator to produce that id first (e.g. via a seeded RNG or test hook), assert the repository retries and succeeds with a different id
- [x] 8.4 Embedded id-collision test: pre-populate a game's goals array with a known id, force the generator to produce that id first when adding a new goal, assert it retries in-memory and succeeds with a different id, without a database round-trip
- [x] 8.5 Cross-game embedded id reuse test: assert two different `Game` documents are allowed to have goals/penalties sharing the same `_id` without error
- [x] 8.6 Duplicate-shirt-number test: create an active player with a given number, attempt to create/update a second active player to the same number, assert `DuplicateShirtNumberError` is thrown
- [x] 8.7 Same-number-different-active-state test: assert one active and one inactive player may share a `number` without error
- [x] 8.8 Idempotent-index test: run `ensureIndexes()` twice against the same database and assert the second call succeeds without error
- [x] 8.9 Index-runs-without-fixtures test: seed a database, then re-run the seed pipeline (fixture insertion skipped) and assert the unique index still exists / is (re-)established
- [x] 8.10 Duplicate-season test: create a season with a given `name`, attempt to create another season whose derived `_id` collides (same `name`), assert a "season already exists" error is thrown rather than a different id being generated

## 9. Verification

- [x] 9.1 `npm run test:unit` passes, including the new id-generation and audit-stamping unit tests (80/80 passed)
- [x] 9.2 `npm run test:integration` passes against `docker compose up -d --wait`, including all tests from section 8 (19/19 passed)
- [x] 9.3 `npm run typecheck` and `npm run lint` pass
- [x] 9.4 Manually ran `npm run db:reset && npm run db:seed` locally and confirmed via `mongosh` (in the `mongo` container) that `players` has `number_1` (`unique: true`, `partialFilterExpression: {active: true}`), and that `games`/`seasons`/`team` indexes match `docs/03-data-model.md` exactly
