## ADDED Requirements

### Requirement: Upload photos to a game
The game detail page SHALL let the admin add photos to a game. The admin can select several files at once. Each file SHALL be uploaded and processed separately, and the page SHALL report success or failure per file. A game SHALL NOT have more than 6 photos. A new photo SHALL be added to the end of the game's photos.

#### Scenario: Upload a photo
- **WHEN** the admin uploads a valid JPEG to a game that has 2 photos
- **THEN** the game has 3 photos, the new one is last, and its processed WebP is stored in S3 under `games/<gameId>/photos/`

#### Scenario: Selecting more files than remaining slots
- **WHEN** a game has 4 photos and the admin selects 3 files
- **THEN** the first 2 are uploaded and the third is reported as not added because the game already has 6 photos

#### Scenario: Upload to a full game is refused
- **WHEN** a game already has 6 photos and an upload request arrives for it
- **THEN** the request fails with "A game can have at most 6 photos", the game is unchanged, and no object is left in S3

#### Scenario: Add control hidden when full
- **WHEN** the admin views a game with 6 photos
- **THEN** the page shows no add-photos control, and says that the 6-photo limit has been reached

#### Scenario: Upload updates the publish indicator
- **WHEN** a photo is added, edited, reordered or deleted
- **THEN** the game's `updatedAt` changes, so the portal shows unpublished changes

### Requirement: Validate uploaded photo files
Before processing, the system SHALL accept only JPEG, PNG and WebP files. It SHALL decide the type by decoding the file, not from its filename or the type the browser reports. Files SHALL be no larger than 25 MB, and images SHALL be no larger than 50 megapixels. Rejected files SHALL write nothing to S3 or the database.

#### Scenario: Unsupported format is rejected
- **WHEN** the admin uploads a HEIC, GIF or non-image file
- **THEN** the upload fails with "Photo must be a JPEG, PNG or WebP image" and nothing is stored

#### Scenario: Oversize file is rejected
- **WHEN** the admin uploads a 30 MB JPEG
- **THEN** the upload fails with "Photo must be 25 MB or smaller" and nothing is stored

#### Scenario: Corrupt image is rejected
- **WHEN** the file has a `.jpg` name but cannot be decoded as an image
- **THEN** the upload fails with a field-level error and nothing is stored

### Requirement: Process photos for the website
Every stored photo SHALL be the processed output, never the original upload. Processing SHALL:
- apply the EXIF orientation
- convert to sRGB
- scale down, keeping the aspect ratio and without cropping, so the image fits within 2400×1350 pixels. Smaller images SHALL NOT be enlarged.
- encode as WebP at high quality
- strip all metadata, including EXIF, GPS and camera details

#### Scenario: Large landscape photo is downscaled
- **WHEN** a 6000×4000 JPEG is uploaded
- **THEN** the stored WebP is 2025×1350

#### Scenario: Portrait photo keeps its shape
- **WHEN** a 3000×4000 JPEG is uploaded
- **THEN** the stored WebP is 1013×1350 and is not cropped

#### Scenario: Small photo is not enlarged
- **WHEN** a 1200×800 PNG is uploaded
- **THEN** the stored WebP is 1200×800

#### Scenario: Rotated phone photo is upright
- **WHEN** a JPEG stored as 4000×3000 with EXIF orientation 6 is uploaded
- **THEN** the stored WebP is portrait (1013×1350)

#### Scenario: Location data is removed
- **WHEN** a JPEG containing GPS EXIF data is uploaded
- **THEN** the stored WebP contains no EXIF metadata

### Requirement: Edit, reorder and delete game photos
The admin SHALL be able to set or clear each photo's alt text and caption, move a photo one place earlier or later, and delete a photo. Deleting a photo SHALL remove it from the game and then delete its S3 object. A failure to delete the S3 object SHALL NOT fail the delete.

#### Scenario: Edit caption and alt text
- **WHEN** the admin saves a caption of "Goal celebration" and alt text of "Warriors players celebrating by the boards"
- **THEN** that photo's `caption` and `alt` are stored trimmed

#### Scenario: Clear a caption
- **WHEN** the admin saves an empty caption
- **THEN** the photo has no `caption` field

#### Scenario: Move a photo earlier
- **WHEN** the admin moves the third photo earlier
- **THEN** it becomes the second photo and the other photos keep their relative order

#### Scenario: Move controls at the ends
- **WHEN** the admin views the first and last photos
- **THEN** the first photo has no "move earlier" control and the last photo has no "move later" control

#### Scenario: Delete a photo
- **WHEN** the admin deletes a photo and confirms
- **THEN** the photo is removed from the game and its S3 object is deleted

### Requirement: Preview photos in the portal
The portal SHALL show a thumbnail of each of a game's photos, read through a portal route from the stored object, so that previews work the same against the local S3 emulator and the real bucket.

#### Scenario: Preview served
- **WHEN** the admin opens a game with photos
- **THEN** each photo is shown in order, served as `image/webp` with `X-Content-Type-Options: nosniff`

#### Scenario: Missing object
- **WHEN** a photo's S3 object does not exist
- **THEN** the preview route returns 404 and the page still renders

### Requirement: Publish game photos
Each game's entry in `results.json` SHALL include `photos: [{ key, alt, caption? }]` in display order when the game has photos, and SHALL omit `photos` when it has none. When a photo has no `alt`, publish SHALL generate one in the form `Photo <n> of <total> from Warriors v <opponent name>, <d MMM yyyy>`. `caption` SHALL be omitted when the photo has none.

#### Scenario: Game with photos
- **WHEN** a game against Cleveland Comets on 12 Oct 2026 has 2 photos, and only the first has alt text and a caption
- **THEN** its `results.json` entry has 2 photos in order. The second has `alt: "Photo 2 of 2 from Warriors v Cleveland Comets, 12 Oct 2026"` and no `caption`.

#### Scenario: Game without photos
- **WHEN** a game has no photos
- **THEN** its `results.json` entry has no `photos` key, so the file is byte-identical to before this change
