## Purpose

Defines the repository layer that is the sole path to MongoDB for the `seasons`, `team`, `players`, `games`, and `publishes` collections: collision-safe ID generation (top-level and embedded), automatic audit-timestamp stamping, the database-level active-player number uniqueness constraint and its typed error translation, and the integration-test coverage that exercises all of the above against a real database. See [03-data-model.md](../../../docs/03-data-model.md) for the canonical data model and `entity-schemas` for the single-document Zod validation this layer builds on.

## Requirements

### Requirement: Repositories are the exclusive database access point
The system SHALL provide one repository per collection (`seasons`, `team`, `players`, `games`, `publishes`), and no other application code SHALL construct a MongoDB query or hold a `db.collection()` handle directly.

#### Scenario: Every collection has a repository
- **WHEN** the repository modules under `lib/repositories/` are enumerated
- **THEN** there is exactly one repository covering each of `seasons`, `team`, `players`, `games`, and `publishes`

### Requirement: Top-level document IDs are generated with collision-safe retry
The system SHALL generate new top-level document `_id`s in the `PREFIX` + 6-digit scheme (`PLR`, `GME`, `PUB`) for the `players`, `games`, and `publishes` collections, and on an `_id` collision SHALL silently regenerate and retry the write up to a bounded attempt limit rather than surfacing the collision as an error. Season ids are explicitly out of scope for this requirement — see the dedicated Season id requirement below.

#### Scenario: Newly created document receives a correctly formatted id
- **WHEN** a repository's `create` method is called for `players`, `games`, or `publishes`
- **THEN** the returned document's `_id` matches that collection's `PREFIX` followed by exactly 6 digits

#### Scenario: An id collision is retried transparently
- **WHEN** a repository generates a candidate `_id` that already exists in the collection
- **THEN** it regenerates a new candidate and retries the write without raising an error to the caller, succeeding once a non-colliding id is found

#### Scenario: Retry limit is bounded
- **WHEN** id generation collides on every attempt up to the configured retry limit
- **THEN** the repository raises an internal error rather than retrying indefinitely

### Requirement: Season IDs are derived deterministically, not randomly generated
The system SHALL derive a new season's `_id` from its `name` (`SSN` + the name's digits, e.g. `"25/26"` → `"SSN2526"`), matching the format and cross-field consistency already enforced by `lib/schemas/season.ts`, rather than generating a random suffix. A collision on a season's derived `_id` SHALL be surfaced as a "season already exists" error rather than retried with a different id.

#### Scenario: New season id is derived from its name
- **WHEN** a season is created with `name: "25/26"`
- **THEN** the stored document's `_id` is `"SSN2526"`

#### Scenario: Creating a season that already exists is rejected, not retried
- **WHEN** a season is created with a `name` whose derived `_id` already exists in the `seasons` collection
- **THEN** the repository raises a "season already exists" error and does not attempt to generate a different id

### Requirement: Embedded goal and penalty IDs are unique within their game
The system SHALL generate `GOL`, `PEN`, `OGL`, and `OPP` ids for entries added to a `Game` document's `team.goals`, `team.penalties`, `opponentTeam.goals`, and `opponentTeam.penalties` arrays such that no two entries within that same `Game` document share an id. Uniqueness across different `Game` documents is explicitly NOT required.

#### Scenario: New goal or penalty receives a correctly formatted id
- **WHEN** a goal, penalty, opponent goal, or opponent penalty is added to a game
- **THEN** its `_id` matches the corresponding prefix (`GOL`, `PEN`, `OGL`, `OPP`) followed by exactly 6 digits

#### Scenario: Collision with a sibling entry in the same game is retried
- **WHEN** a generated id for a new goal or penalty matches an id already present among that game's existing goals/penalties
- **THEN** a new id is generated and checked again, without a database round-trip, until a non-colliding id is found

#### Scenario: The same id may exist in two different games
- **WHEN** two goals in two different `Game` documents happen to share the same generated `_id`
- **THEN** no error is raised and both writes succeed, since uniqueness is scoped to a single game document

### Requirement: Audit timestamps are stamped automatically
The system SHALL set `createdAt` and `updatedAt` to the current time when a repository creates a document, and SHALL set `updatedAt` to the current time (leaving `createdAt` unchanged) when a repository updates a document. Callers SHALL NOT be able to set these fields directly through a repository's `create` or `update` methods.

#### Scenario: Create stamps both timestamps
- **WHEN** a repository's `create` method is called
- **THEN** the stored document has `createdAt` and `updatedAt` both set to the time of creation

#### Scenario: Update stamps only updatedAt
- **WHEN** a repository's `update` method is called on an existing document
- **THEN** the stored document's `updatedAt` reflects the time of the update and `createdAt` is unchanged from its original value

#### Scenario: Caller-supplied audit fields are ignored
- **WHEN** a caller passes `createdAt` or `updatedAt` values into a repository's `create` or `update` method
- **THEN** the repository ignores them and applies its own current-time values instead

### Requirement: Team repository has no create operation
The system SHALL provide read and update operations for the `team` collection, and SHALL NOT provide a `create` operation on the team repository.

#### Scenario: Team repository exposes read and update
- **WHEN** the team repository's public methods are enumerated
- **THEN** read and update operations are present

#### Scenario: Team repository has no create method
- **WHEN** the team repository's public methods are enumerated
- **THEN** no `create` method exists

### Requirement: Active player numbers are unique at the database level
The system SHALL enforce, via a MongoDB partial unique index on `{ number: 1 }` where `{ active: true }` on the `players` collection, that no two documents with `active: true` share the same `number`. This index SHALL be created idempotently and unconditionally as part of the seed pipeline, independent of whether fixture documents are inserted.

#### Scenario: Duplicate active number is rejected at the database
- **WHEN** a write would result in two `players` documents both having `active: true` and the same `number`
- **THEN** the database rejects the write

#### Scenario: Same number is allowed across an active and an inactive player
- **WHEN** one player with a given `number` is `active: true` and another player with the same `number` is `active: false`
- **THEN** the write succeeds, since the constraint only applies among active players

#### Scenario: Index creation is idempotent
- **WHEN** the index-creation step runs against a database where the index already exists
- **THEN** it completes successfully without error and without duplicating the index

#### Scenario: Index creation runs independently of fixture insertion
- **WHEN** the seed pipeline runs against a database that already contains documents (so fixture insertion is skipped)
- **THEN** the index-creation step still runs and the unique constraint is still established

### Requirement: Duplicate shirt number surfaces as a typed error
The system SHALL translate a database rejection caused by the active-player unique-number constraint into a typed `DuplicateShirtNumberError`, distinguishable from other errors, rather than propagating the raw MongoDB driver error to the caller.

#### Scenario: Duplicate number raises the typed error
- **WHEN** a repository write violates the active-player unique-number constraint
- **THEN** the repository throws a `DuplicateShirtNumberError` (not a raw `MongoServerError`)

#### Scenario: An unrelated duplicate-key error is not misclassified
- **WHEN** a repository write triggers a duplicate-key error on a document's own generated `_id` rather than the `number` index
- **THEN** the write is retried with a newly generated id (per the id-generation requirement above) rather than raising `DuplicateShirtNumberError`

### Requirement: Data-access layer is covered by integration tests against a real database
The system SHALL include integration tests, run via `npm run test:integration` against the real local MongoDB started by `docker-compose.yml`, covering create/read/update/delete for each repository, top-level id-collision retry, embedded id-collision retry within a single game, and the duplicate-shirt-number error path.

#### Scenario: Integration suite exercises CRUD per repository
- **WHEN** `npm run test:integration` is run against the local Docker stack
- **THEN** it includes passing tests that create, read, update, and delete a document through each repository (except `team`, which has no create)

#### Scenario: Integration suite exercises id collision handling
- **WHEN** `npm run test:integration` is run against the local Docker stack
- **THEN** it includes a passing test that pre-seeds a document with a specific `_id`, forces the generator to produce that same id first, and asserts the repository retries and succeeds with a different id

#### Scenario: Integration suite exercises the duplicate shirt number error
- **WHEN** `npm run test:integration` is run against the local Docker stack
- **THEN** it includes a passing test that creates an active player with a given number, attempts to create or update a second active player to the same number, and asserts a `DuplicateShirtNumberError` is thrown
