## Why

KAN-18: the admin needs to record that a game happened — date, season, opponent, type, location, and who played — so that game data (and eventually stats) has a source of truth. The full `Game` schema and repository layer were already built speculatively under KAN-13/14 but nothing in the UI creates, lists, or displays a game yet; `/games` is still the KAN-8 placeholder. Recording a game is meaningless to an admin unless they can also see that it "counted" — so this change also gives players and the team a basic games-played view, since no such view exists anywhere in the app today (KAN-17, which would have covered player stats, was closed without being built).

## What Changes

- New `/games` page: replaces the KAN-8 placeholder with a season-grouped list of every game (sections ordered ascending by season, each showing a games-played count for that season, including seasons with zero games), each row showing date, opponent, and a derived score, linking to that game's detail page.
- New `/games/new` create form: date, season (from existing seasons), opponent name (free text), game type restricted to `CHALLENGE`/`BOTBC`/`LLIHC` (NIHC excluded from the picker but still valid on historical data — no schema change), location (Home/Away), and a roster picker limited to active players with no duplicates. On success, creates the game and redirects to its detail page.
- New `/games/[id]` detail page: renders the full recorded game (date, season, opponent, type, location, roster).
- New `/players/[id]` player-profile page: name, number, positions, and a season-grouped list of games that player was rostered in (with a per-season games-played count), including seasons with zero games.
- A real (not hardcoded) score derivation function following `docs/03-data-model.md`'s formula, used on `/games`. It will always compute 0-0 today since no goals can be entered yet, but requires no revisit once goal entry ships.
- **Modified**: `/players` roster rows become whole-row links to `/players/[id]` (previously rows were explicitly not clickable, only the edit icon was). The edit icon is unchanged.
- **Modified**: `/games` is no longer a placeholder area page.

## Capabilities

### New Capabilities
- `game-management`: recording a new game (`/games/new`), viewing the season-grouped list of all games (`/games`), and viewing a single game's details (`/games/[id]`).
- `player-profile`: viewing a single player's basic details and their season-by-season games-played history (`/players/[id]`).

### Modified Capabilities
- `roster-list`: the "Roster table links to player creation, not to individual players" requirement changes — whole rows become navigable to the new player-profile page; the dedicated edit icon's behavior is unchanged.
- `portal-shell`: the "Placeholder area pages" requirement changes — `/games` is no longer a placeholder; only `/seasons` remains one.

## Impact

- New: `app/games/new/page.tsx`, `app/games/[id]/page.tsx`, `app/games/actions.ts`, `app/games/GameForm.tsx` (or similar), `app/players/[id]/page.tsx`.
- Modified: `app/games/page.tsx` (placeholder → real list), `app/players/page.tsx` (whole-row navigation).
- New: a small pure score-derivation helper (e.g. `lib/derived/score.ts`) plus unit tests.
- No changes to `lib/schemas/game.ts`, `lib/repositories/games.ts`, `lib/repositories/seasons.ts`, `lib/repositories/players.ts`, or `lib/repositories/team.ts` — all required data-access functions (`createGame`, `getGame`, `listGames`, `listSeasons`, `listPlayers`, `getTheTeam`) already exist. All season/roster grouping and filtering happens in-memory, the same way `/players` already groups Active/Inactive.
- New Playwright E2E coverage for game creation and the games-played views.
