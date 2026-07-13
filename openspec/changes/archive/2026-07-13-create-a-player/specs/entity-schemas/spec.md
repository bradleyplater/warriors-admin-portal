## MODIFIED Requirements

### Requirement: Player schema and validation
The system SHALL provide a Zod schema for `Player` enforcing number range, non-empty positions, and optional fields (`nickname`, `imagePath`) from `docs/03-data-model.md`. Uniqueness of `number` among active players is explicitly NOT enforced by this schema. `imagePath` is a bare S3 object key/filename (e.g. `"plr100010.jpg"`), not a full URL, so that stored documents remain portable across environments with different S3 hosts/buckets.

#### Scenario: Valid player passes
- **WHEN** a document with `number: 42`, `positions: ["Forward"]`, and required identity fields is validated
- **THEN** validation succeeds

#### Scenario: Number out of range is rejected
- **WHEN** a document's `number` is `0` or `100` or higher
- **THEN** validation fails with a field-level error on `number`

#### Scenario: Empty positions array is rejected
- **WHEN** a document's `positions` array is empty
- **THEN** validation fails with a field-level error on `positions`

#### Scenario: Schema does not check number uniqueness
- **WHEN** two separate documents both validated independently share the same `number`
- **THEN** both validate successfully in isolation (uniqueness is enforced elsewhere, not by this schema)

#### Scenario: imagePath accepts a bare identifier, not a full URL
- **WHEN** a document's `imagePath` is `"plr100010.jpg"`
- **THEN** validation succeeds, and a full URL such as `"https://example.com/plr100010.jpg"` is not required and is not treated specially
