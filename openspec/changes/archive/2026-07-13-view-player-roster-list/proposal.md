## Why

`/players` currently shows only a bare name-and-number list — deliberately deferred scope from KAN-15 ("positions, active/inactive grouping, nickname, images, styling, sorting, and filtering are explicitly deferred to KAN-41"). Admins have no way to see a player's position(s), whether they're active, or their nickname without opening the database directly, and KAN-16 (edit/deactivate) has no list to link from once it exists.

## What Changes

- Replace the minimal list on `/players` with a table showing shirt number, name, position(s), active status, and nickname (if set), grouped into "Active" and "Inactive" sections.
- Move the create-player form off `/players` onto a new `/players/new` route. `/players` becomes list-only, with an "Add new player" button near the top linking to `/players/new`.
- **BREAKING**: `createPlayerAction` redirects to `/players` on success instead of returning inline success state for a stay-and-reset form. Remove the now-dead success-message/reset-token UI from `PlayerForm`.
- Table rows are not linked or clickable — no `/players/[id]` route is created in this change. (KAN-16 will add navigation to a detail/edit view later.)
- Rewrite `e2e/create-player.spec.ts` for the new `/players/new` → redirect → `/players` flow, and add E2E coverage asserting seeded players render in the correct Active/Inactive section of the roster table.

## Capabilities

### New Capabilities
- `roster-list`: the grouped Active/Inactive player table on `/players`, the "Add new player" button, and the create-then-redirect flow that makes new/edited players appear in the list without a manual reload.

### Modified Capabilities
- `player-management`: remove the "Minimal player list" requirement (name+number list on `/players`) — superseded by `roster-list`. The create-form requirements are unchanged in substance but now describe behavior at `/players/new`, and the successful-submission scenario changes from "inline confirmation" to "redirect to `/players`".
- `portal-shell`: the "Placeholder area pages" requirement's note about `/players` ("serves the create-player form and minimal player list") is stale once the form moves to `/players/new` and the list becomes the fuller roster table; update the requirement text and scenario to match.

## Impact

- New: `app/players/new/page.tsx` (hosts `PlayerForm`), roster table rendering in `app/players/page.tsx`.
- Changed: `app/players/page.tsx` (list replaced with table, form removed, button added), `app/players/actions.ts` (redirect instead of returning success state), `app/players/PlayerForm.tsx` (drop inline success/reset UI), `app/players/form-state.ts` (drop fields no longer needed), `e2e/create-player.spec.ts` (rewritten for new flow).
- Consumes (no changes needed): `lib/repositories/players.ts` (`listPlayers()`), `lib/schemas/player.ts`.
- Out of scope: `/players/[id]` detail/edit route (KAN-16), filtering/sorting controls, player images.
