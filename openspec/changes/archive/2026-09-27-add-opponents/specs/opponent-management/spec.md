## ADDED Requirements

### Requirement: Opponent schema
The system SHALL provide a Zod schema for `Opponent` with an `_id` (`OPN` followed by exactly 6 digits), a non-empty trimmed `name`, an optional `logo` object of `{ key, contentType }`, and audit timestamps, plus a create-input variant that omits `_id`, `createdAt`, and `updatedAt`. `logo.contentType` SHALL be one of `image/svg+xml`, `image/png`, `image/jpeg`, or `image/webp`, and `logo.key` SHALL end in the extension matching that content type.

#### Scenario: Opponent without a logo is valid
- **WHEN** an opponent document with an `_id`, a non-empty `name`, and no `logo` is validated
- **THEN** validation succeeds

#### Scenario: Opponent with a logo is valid
- **WHEN** an opponent document has `logo: { key: "opponents/OPN123456/logo-1759000000000.svg", contentType: "image/svg+xml" }`
- **THEN** validation succeeds

#### Scenario: Unsupported content type is rejected
- **WHEN** an opponent's `logo.contentType` is not one of the allowed image types
- **THEN** validation fails with a field-level error on `logo.contentType`

#### Scenario: Key extension must match content type
- **WHEN** an opponent's `logo.key` ends in `.png` but `logo.contentType` is `image/svg+xml`
- **THEN** validation fails with a field-level error on `logo.key`

### Requirement: Opponent names are unique
The system SHALL reject creating or renaming an opponent to a name that already belongs to another opponent, compared case-insensitively after trimming, and SHALL surface this as a field-level error on the name rather than a crash.

#### Scenario: Duplicate name on create is rejected
- **WHEN** an admin creates an opponent named "cleveland comets" while an opponent named "Cleveland Comets" exists
- **THEN** no opponent is created and the form shows an error on the name field

#### Scenario: Renaming to an existing name is rejected
- **WHEN** an admin renames an opponent to the name of a different existing opponent
- **THEN** the opponent is not updated and the form shows an error on the name field

### Requirement: Admin can list opponents
The system SHALL render, at `/opponents`, every opponent sorted by name, each showing its name and its logo (or a "No logo" placeholder), and each linking to that opponent's edit page. The page SHALL render per request so opponents created after server start are visible.

#### Scenario: Opponents are listed alphabetically
- **WHEN** an admin opens `/opponents` with opponents "Warbirds" and "Beighton Bombers" stored
- **THEN** "Beighton Bombers" is listed before "Warbirds"

#### Scenario: Opponent without a logo shows a placeholder
- **WHEN** an opponent has no `logo`
- **THEN** its row shows a "No logo" placeholder instead of an image

### Requirement: Admin can create an opponent
The system SHALL provide a form at `/opponents/new` capturing a name and an optional logo file, and SHALL create the opponent when submitted with valid data, uploading the logo first if one was provided.

#### Scenario: Creating an opponent without a logo
- **WHEN** the form is submitted with a valid, unique name and no file
- **THEN** an opponent is created with no `logo`, and the admin is redirected to `/opponents`

#### Scenario: Creating an opponent with a logo
- **WHEN** the form is submitted with a valid, unique name and a PNG file
- **THEN** the file is stored in `S3_BUCKET` at `opponents/<id>/logo-<timestamp>.png` with `Content-Type: image/png`, and the opponent is created with `logo` set to that key and content type

#### Scenario: Missing name is rejected
- **WHEN** the form is submitted with an empty name
- **THEN** no opponent is created, no file is uploaded, and the form shows an error on the name field

### Requirement: Admin can edit an opponent and replace its logo
The system SHALL provide a form at `/opponents/[id]/edit`, pre-filled with the opponent's name and showing its current logo, that can rename the opponent and upload a replacement logo. A replacement SHALL be stored under a new key, so the CDN never serves a cached old logo for the new key, and the previous object SHALL be deleted from S3 only after the opponent document has been updated.

#### Scenario: Renaming an opponent
- **WHEN** the edit form is submitted with a new, unique name and no file
- **THEN** the opponent's name is updated, its `logo` is unchanged, and every game referencing it shows the new name

#### Scenario: Replacing a logo
- **WHEN** the edit form is submitted with a new SVG file for an opponent whose logo key is `opponents/OPN123456/logo-1.png`
- **THEN** the new file is stored at a new `opponents/OPN123456/logo-<timestamp>.svg` key with `Content-Type: image/svg+xml`, the opponent's `logo` is updated to that key and content type, and `opponents/OPN123456/logo-1.png` is deleted

#### Scenario: Unknown opponent id renders a 404
- **WHEN** `/opponents/[id]/edit` is opened for an id that does not match any opponent
- **THEN** the response is a 404 not-found page

### Requirement: Logo uploads are validated before storage
The system SHALL accept only files whose type is one of `image/svg+xml`, `image/png`, `image/jpeg`, or `image/webp` and whose size is at most 5 MB, and SHALL reject any other file with a field-level error without writing anything to S3 or the database.

#### Scenario: Unsupported file type is rejected
- **WHEN** a `.gif` or `.pdf` file is submitted as a logo
- **THEN** the submission is rejected with an error on the logo field and nothing is uploaded

#### Scenario: Oversized file is rejected
- **WHEN** a file larger than 5 MB is submitted as a logo
- **THEN** the submission is rejected with an error on the logo field and nothing is uploaded

#### Scenario: A few-MB logo is accepted
- **WHEN** a 3 MB PNG is submitted as a logo
- **THEN** it is accepted and uploaded, without the request being rejected by the server action body size limit

### Requirement: Referenced opponents cannot be deleted
The system SHALL allow deleting an opponent from its edit page only when no game references it. When no game references it, the opponent document SHALL be deleted and its logo object (if any) removed from S3. When one or more games reference it, deletion SHALL be refused with a message stating how many games reference it.

#### Scenario: Deleting an unreferenced opponent
- **WHEN** an admin deletes an opponent that no game references
- **THEN** the opponent document is removed, its logo object is deleted from S3, and the admin is redirected to `/opponents`

#### Scenario: Deleting a referenced opponent is blocked
- **WHEN** an admin tries to delete an opponent referenced by 3 games
- **THEN** the opponent is not deleted, its logo is not deleted, and the page shows that it is used by 3 games

### Requirement: Published results are enriched from opponent data
When generating `results.json`, the system SHALL resolve each game's `opponentTeam.opponentId` against the opponents collection, set the entry's `opponentTeam` to that opponent's current name, and set `logoImage` to the opponent's `logo.key` when a logo exists, omitting `logoImage` otherwise. No separate opponents artifact SHALL be published.

#### Scenario: Opponent with a logo
- **WHEN** results are generated for a game whose opponent has a logo with key `opponents/OPN123456/logo-1.svg`
- **THEN** that game's entry has the opponent's name as `opponentTeam` and `"opponents/OPN123456/logo-1.svg"` as `logoImage`

#### Scenario: Opponent without a logo
- **WHEN** results are generated for a game whose opponent has no logo
- **THEN** that game's entry has the opponent's name as `opponentTeam` and no `logoImage` field

#### Scenario: Renaming an opponent changes the next publish
- **WHEN** an opponent is renamed after the last successful publish
- **THEN** the regenerated `results.json` has a different checksum and is uploaded on the next publish

#### Scenario: Dangling opponent reference fails generation
- **WHEN** a game references an `opponentId` that does not exist
- **THEN** artifact generation fails with an error naming the game and the missing opponent id, rather than publishing an entry without an opponent name

