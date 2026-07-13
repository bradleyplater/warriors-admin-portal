## Why

Admins can currently only create players (KAN-15) and view the roster (KAN-41) — there is no way to fix a mistyped field or take a player out of active rotation when they leave, short of editing the database directly. KAN-16 closes that gap.

## What Changes

- Add an edit icon to each row in the `/players` roster table, linking to `/players/[id]/edit`.
- Add an edit form at `/players/[id]/edit`, pre-filled with the player's current data, reusing the same fields and client-side validation as the create form (`PlayerForm`).
- Add an `updatePlayerAction` server action that validates against `PlayerCreateInputSchema` (partial semantics for unset fields not being wiped) and calls the existing `updatePlayer` repository function — no repository or schema changes needed, both already support this.
- Make the `active` flag an editable control on the edit form, so deactivating and reactivating a player happens through the same form as any other edit.
- Surface `DuplicateShirtNumberError` as a field-level error on the number field, exactly as the create form already does — this is what blocks reactivating into a shirt number now taken by another active player.
- Add an E2E journey: edit a field, deactivate a player, and verify they move from the Active to the Inactive section of the roster table.

Out of scope: excluding deactivated players from a game roster picker. No game-creation UI exists yet in this codebase, so there is nothing to exclude a player from. That part of the Jira acceptance criteria will be picked up when game creation is built.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `player-management`: adds a requirement that an admin can edit any player field (including `active`) via a form at `/players/[id]/edit`, sharing validation with the create form, and that a duplicate-shirt-number conflict on reactivation is rejected as a field-level error.
- `roster-list`: relaxes the existing "roster rows are not links" requirement to allow a dedicated edit icon per row that links to the edit route, while the rest of the row remains non-interactive.

## Impact

- `app/players/page.tsx`: add an edit icon/link per row.
- `app/players/[id]/edit/page.tsx` (new): edit form page, loads the player via `getPlayer`.
- `app/players/actions.ts`: add `updatePlayerAction`.
- `app/players/PlayerForm.tsx`: generalize to support both create and edit modes (initial values, submit label).
- `lib/repositories/players.ts`: no changes — `updatePlayer` and `DuplicateShirtNumberError` already exist and cover this.
- `lib/schemas`: no changes — `PlayerCreateInputSchema`/`PlayerSchema` already cover the fields being edited.
- E2E test suite: new journey covering edit + deactivate.
