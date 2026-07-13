## Why

Admins currently have no way to add a player to the roster — `/players` is still the KAN-8 placeholder ("Player management is coming soon."). KAN-13 (schemas) and KAN-14 (repository layer, now merged to `main`) already provide everything a create flow needs server-side (`createPlayer()`, id generation, `DuplicateShirtNumberError`); this change wires a real form and minimal list on top of that layer so KAN-15's acceptance criteria are met.

## What Changes

- Add a create-player form (native Next.js Server Action + `useActionState`, no form library) at `/players` capturing first name, surname, shirt number, positions, active flag, optional nickname, optional image identifier.
- Add a genuinely minimal player list at `/players` — name and shirt number only — just enough to satisfy "the created player appears in the player list immediately." Positions, active/inactive grouping, nickname, images, styling, sorting, and filtering are explicitly deferred to KAN-41 (View the player roster list), a separate ticket.
- Wire client and server validation through the existing `PlayerCreateInputSchema` (no duplicate validation logic), and surface a thrown `DuplicateShirtNumberError` as a field-level error on the shirt number field. Client-side does not pre-check number uniqueness — that stays a write-time check by design (see `entity-schemas` spec).
- **BREAKING**: Replace the `Player` schema's `imageUrl: z.url()` with `imagePath: z.string().min(1)` — an S3 object key/filename rather than a full URL. The full-URL shape bakes an environment-specific host into stored documents (e.g. local MinIO), which contradicts the env-portability guarantee in the `local-docker-environment` spec. Updates: `lib/schemas/player.ts`, `lib/schemas/player.test.ts`, `seed/data/players.ts`, `seed/types.ts`, `docs/03-data-model.md`. No S3 upload UI is added — the form takes the identifier as plain text.
- Add Playwright E2E coverage of the create-player journey, including validation failures (out-of-range number, non-numeric number, empty positions, duplicate active shirt number).

## Capabilities

### New Capabilities
- `player-management`: create-player form, validation wiring, duplicate-number error handling, and the minimal player list that displays created players.

### Modified Capabilities
- `entity-schemas`: `Player`'s `imageUrl` (full URL) becomes `imagePath` (bare identifier); update the requirement and scenarios referencing `imageUrl`.
- `portal-shell`: `/players` is no longer a placeholder page — the "Placeholder area pages" requirement no longer applies to `/players` (it still applies to `/games` and `/seasons`).

## Impact

- New: player creation UI/server action under `app/players/`, Playwright E2E spec.
- Changed: `lib/schemas/player.ts` (and its test), `seed/data/players.ts`, `seed/types.ts`, `docs/03-data-model.md`.
- Consumes (no changes needed): `lib/repositories/players.ts` (`createPlayer`, `listPlayers`, `DuplicateShirtNumberError`) from KAN-14, already merged.
- Out of scope: editing/deactivating players (KAN-16), player profile/stats (KAN-17), the fuller roster list (KAN-41), any S3 upload widget.
