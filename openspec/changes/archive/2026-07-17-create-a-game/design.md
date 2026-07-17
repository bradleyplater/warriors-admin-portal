## Context

`/games` is currently the KAN-8 placeholder. Unlike KAN-15 (create-player), the data-access layer this change needs was already built speculatively under KAN-13/14 and has sat unused: `lib/schemas/game.ts` exposes `GameCreateInputSchema`/`GameSchema` with full validation (roster no-dupes, cross-field roster-membership checks for goals/penalties/awards, NIHC valid at the schema level regardless of new-vs-historical per the `entity-schemas` spec), and `lib/repositories/games.ts` exposes `createGame`, `getGame`, `listGames` (unfiltered), plus goal/penalty mutators this change does not use. `lib/repositories/team.ts` already has `getTheTeam()` (added during KAN-15 for the identical need of resolving a singleton `teamId`). `listSeasons()` and `listPlayers()` are also unfiltered, and the existing `/players` page already establishes the pattern of grouping/filtering an unfiltered list in memory (Active/Inactive sections) rather than pushing filters into the repository layer.

This change was scoped up during exploration: KAN-18's own acceptance criteria ("every rostered player's games played for that season reflects the new game, and so does the team's games played") can't be verified through the UI today, because no games-played concept is displayed anywhere in the app. KAN-17 (player profile with season stats) was closed without being built, and KAN-5 (Stats Engine) — which owns the full derived-stats set (goals, assists, points, PIMs, MOTM/WOTG counts) — hasn't started. Rather than leave that acceptance criterion unverifiable, this change adds a minimal player-profile page and a season-grouped games list, scoped tightly to games-played counts only.

## Goals / Non-Goals

**Goals:**
- A working create-game form at `/games/new`, validated identically client/server via `GameCreateInputSchema`.
- A season-grouped `/games` list (ascending by season) showing every recorded game, each season's games-played count, and a real (not hardcoded) derived score per game.
- A `/games/[id]` detail page showing everything recorded about one game.
- A minimal `/players/[id]` page proving the games-played acceptance criterion: that player's season-grouped games-played history.
- Whole-row navigation from `/players` to the new player-profile page.

**Non-Goals:**
- Recording goals, penalties, netminder, or awards (Player of the Game / Warrior of the Game) — these are separate future stories under the KAN-4 Game Management epic. The create form submits empty goals/penalties arrays and omits the optional award fields.
- Any stat beyond games-played on the player-profile page — no goals, assists, points, PIMs, or award counts. This page is deliberately not a KAN-17/KAN-5 revival.
- A "current season" concept. None exists in the data model (`Season` is just `{ _id, name, createdAt, updatedAt }`) and this change does not add one — season sections are simply every season from `listSeasons()`, ordered ascending.
- Editing or deleting a game.
- Any repository or schema change — every data-access function this change needs already exists.

## Decisions

**Season-grouped, not "current season"-scoped.** Both `/games` and `/players/[id]` render one section per season (ascending, e.g. 22/23 → 23/24 → 24/25), each with its own games-played count, rather than trying to infer a single "current" season. There is no `current`/`active` flag on `Season` and adding one (plus the admin workflow to maintain it) is out of scope for a "create a game" ticket — sectioning by season sidesteps the question entirely and is more useful anyway (an admin can see history, not just this year). Sections render even when empty (0 games), matching how `/players` already renders an empty "Inactive (0)" section rather than hiding it.

**In-memory grouping over unfiltered lists, no new repository code.** `listGames()`, `listSeasons()`, and `listPlayers()` are already unfiltered. `/games` groups `listGames()` by `seasonId` in memory; `/players/[id]` filters `listGames()` to games where `team.roster` contains that player's id, then groups by `seasonId`. This mirrors `/players`' existing Active/Inactive in-memory split exactly. Given the tiny data volumes in this app (documented in KAN-10's seed scope: ~10 games, ~20 players, 4 seasons), a repository-level query layer would be premature.

**Real score derivation, not a placeholder.** `docs/03-data-model.md`'s Score formula (team total = count of non-SO goals, +1 to the shootout winner if any SO goal exists; same for the opponent) is implemented as a small pure function (e.g. `lib/derived/score.ts`) operating on a `Game`'s `team.goals`/`opponentTeam.goals`. Every game created by this change has empty goals arrays, so the displayed score is always 0-0 today — but the function is correct for whenever a future ticket adds goal entry, so `/games` never needs to be revisited for this. Rejected: hardcoding "0-0" as a display string, which would silently become wrong (or need a synchronized follow-up change) the moment goals exist.

**Player-profile is a new capability, not an extension of `player-management`.** `player-management` (KAN-15/16) covers the create and edit *forms*. `/players/[id]` is a read-only view, conceptually closer to what KAN-17 would have been. Naming it `player-profile` keeps the create/edit form capability's scope unchanged and gives future stat work (KAN-5/KAN-17, if resumed) an obvious existing capability to extend rather than needing to redraw boundaries later.

**Whole-row navigation replaces the "rows are not links" rule in `roster-list`.** The existing rule ("Individual roster rows SHALL NOT themselves be clickable... The only per-row navigation permitted is a dedicated edit icon") was a deliberate KAN-16/41 decision made when no player-detail destination existed. Now one does. The row becomes a link to `/players/[id]`; the edit ✎ icon is unchanged and continues to link to `/players/[id]/edit` — both affordances coexist on the same row.

**Redirect to the detail page on create, not back to the list.** This differs from create-player (KAN-15), which redirects to `/players` after creation. Here, landing on `/games/[id]` immediately shows the admin what they just recorded and is the natural verification point for the "required fields captured correctly" acceptance criteria — the E2E journey creates a game and asserts against the detail page it lands on, then separately visits `/games` and `/players/[id]` to assert the season counts incremented.

**Server Action + `useActionState`, no new dependencies** — same architecture as create-player: one Zod schema (`GameCreateInputSchema`) parsed once server-side from `FormData`, `error.flatten().fieldErrors` reflected client-side, no form library.

**NIHC exclusion is UI-only.** The create form's game-type control simply doesn't offer `NIHC` as an option; `GameCreateInputSchema` already accepts all four `GameType` values unconditionally (confirmed in `entity-schemas/spec.md`), so historical NIHC games keep validating with no schema change.

## Risks / Trade-offs

- **[Risk]** `/players/[id]` and `/games` both duplicate season-grouping logic. → **Mitigation**: small enough (group-by on ~10 records) that a shared helper isn't yet justified; revisit if a third season-grouped view appears.
- **[Trade-off]** Every game shows 0-0 until a future ticket adds goal entry, which may look broken to an admin. → Accepted: the alternative (hardcoding "0-0") is worse — a real derivation that's currently fed no data is honest about the current state of the system, not a lie waiting to be found.
- **[Risk]** Whole-row navigation on `/players` is a user-facing behavior reversal from a recent, deliberate decision (KAN-16/41). → **Mitigation**: explicitly re-approved during this change's exploration; the edit icon's behavior is preserved unchanged so existing muscle memory for editing still works.

## Open Questions

- None outstanding — all prior open threads (season-vs-current-season, whole-row-click vs second icon, score placeholder-vs-real, capability naming) were resolved during exploration before this design was written.
