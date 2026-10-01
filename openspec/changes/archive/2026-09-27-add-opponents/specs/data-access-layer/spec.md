## MODIFIED Requirements

### Requirement: Repositories are the exclusive database access point
The system SHALL provide one repository per collection (`seasons`, `team`, `players`, `games`, `opponents`, `publishes`), and no other application code SHALL construct a MongoDB query or hold a `db.collection()` handle directly.

#### Scenario: Every collection has a repository
- **WHEN** the repository modules under `lib/repositories/` are enumerated
- **THEN** there is exactly one repository covering each of `seasons`, `team`, `players`, `games`, `opponents`, and `publishes`

### Requirement: Top-level document IDs are generated with collision-safe retry
The system SHALL generate new top-level document `_id`s in the `PREFIX` + 6-digit scheme (`PLR`, `GME`, `OPN`, `PUB`) for the `players`, `games`, `opponents`, and `publishes` collections, and on an `_id` collision SHALL silently regenerate and retry the write up to a bounded attempt limit rather than surfacing the collision as an error. Season ids are explicitly out of scope for this requirement — see the dedicated Season id requirement below.

#### Scenario: Newly created document receives a correctly formatted id
- **WHEN** a repository's `create` method is called for `players`, `games`, `opponents`, or `publishes`
- **THEN** the returned document's `_id` matches that collection's `PREFIX` followed by exactly 6 digits

#### Scenario: An id collision is retried transparently
- **WHEN** a repository generates a candidate `_id` that already exists in the collection
- **THEN** it regenerates a new candidate and retries the write without raising an error to the caller, succeeding once a non-colliding id is found

#### Scenario: Retry limit is bounded
- **WHEN** id generation collides on every attempt up to the configured retry limit
- **THEN** the repository raises an internal error rather than retrying indefinitely

## ADDED Requirements

### Requirement: Opponent names are unique at the database level
The system SHALL enforce opponent name uniqueness with a unique, case-insensitive (collation strength 2) index on the opponents collection's `name`, and the opponents repository SHALL surface a violation as a typed duplicate-name error rather than a raw driver error.

#### Scenario: Concurrent duplicate insert is rejected by the index
- **WHEN** two opponents differing only in letter case are inserted
- **THEN** the second insert fails and the repository raises its typed duplicate-name error

### Requirement: Games can be counted by opponent
The games repository SHALL provide a count of games referencing a given `opponentId`, used to block deletion of referenced opponents, backed by an index on `opponentTeam.opponentId`.

#### Scenario: Counting references
- **WHEN** 3 games reference opponent `OPN123456` and none reference `OPN654321`
- **THEN** the count for `OPN123456` is 3 and for `OPN654321` is 0
