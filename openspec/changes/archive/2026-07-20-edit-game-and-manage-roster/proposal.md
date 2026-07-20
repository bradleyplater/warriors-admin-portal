## Why

KAN-19: once a game is recorded (KAN-18), an admin has no way to fix a mistyped date/opponent/type/location, or to correct who actually played, short of editing the database directly. Roster corrections need care beyond a simple field edit — because `team.roster` is what goals, assists, penalties, and awards point at, removing a player who is still referenced by one of those would silently corrupt the game record (or, as currently implemented, throw an opaque schema-validation error) unless the removal is checked and reported clearly.

## What Changes

- New `/games/[id]/edit` form: date, season, opponent name, game type, location — pre-filled, sharing validation with the existing create form, calling the existing `updateGame` repository function (already supports all of these fields; no repository or schema changes needed for this part).
- New `/games/[id]/roster` form, **separate from** the details edit form: add and remove rostered players. The player picker offers the union of currently-rostered players and active players (not active-only like the create form's picker), so a player who has since gone inactive remains visible and removable.
- New roster-removal guard: removing a player still referenced by a goal (as scorer or assist), a penalty (as offender), the netminder selection, or an award (Man of the Match / Warrior of the Game) is blocked **for that player only** — every other requested change in the same submission (other removals, any additions) still applies. The blocked player(s) reappear in the roster with a message naming exactly what still references them (e.g. "scored 2 goals, recorded 1 assist, and was netminder for this game"), using the specific award name rather than a generic "award" label.
- `/games/[id]` gains two distinct entry points — "Edit details" and "Manage roster" — replacing the single implicit edit affordance games currently lack.
- No changes needed for games-played totals: `/players/[id]` already derives games-played by filtering `listGames()` on live roster membership, so a roster edit is reflected automatically with no counter to maintain.
- New E2E coverage: editing game details, adding/removing roster players, and the blocked-removal case (using existing seed data, which already has goals/penalties/awards referencing seeded players — no goal/penalty-entry UI is a prerequisite).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `game-management`: adds requirements for editing an existing game's details (`/games/[id]/edit`), managing an existing game's roster (`/games/[id]/roster`), and blocking a roster removal only for players still referenced by a goal, assist, penalty, netminder selection, or award — with a message naming the specific references.

## Impact

- New: `app/games/[id]/edit/page.tsx`, `app/games/[id]/roster/page.tsx`, `app/games/RosterForm.tsx`.
- Modified: `app/games/[id]/page.tsx` (add "Edit details" / "Manage roster" links), `app/games/GameForm.tsx` (generalize for create/edit reuse, matching the existing `PlayerForm` create/edit pattern), `app/games/actions.ts` (add `updateGameAction`, `updateGameRosterAction`), `app/games/form-state.ts`.
- Modified: `lib/repositories/games.ts` (add `updateGameRoster`, which performs the partial-removal write described in `design.md`), `lib/repositories/internal/errors.ts` (add `RosterPlayerReferencedError`).
- No changes: `lib/schemas/game.ts` — `GameSchema`'s existing cross-field validation already backs the roster/reference invariants this relies on.
- New Playwright E2E coverage: game-details edit, roster add/remove, and blocked-removal-of-one-player-among-several.
