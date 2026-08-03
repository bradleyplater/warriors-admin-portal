## Context

`GameSchema`, `updateGame`, `checkGameRefs`, the roster-removal blocking logic, and `derivePlayerSeasonStats` already fully support `netminderPlayerId`, `manOfTheMatchPlayerId`, and `warriorOfTheGamePlayerId` (built in KAN-19/KAN-20). The only gap is a UI surface to set them. The codebase already has an established precedent for a roster-dependent, single-concern edit form living on its own route: `/games/[id]/roster` (`RosterForm.tsx` + `updateGameRosterAction`), separate from `/games/[id]/edit` (`GameForm.tsx` + `updateGameAction`), which only touches date/season/type/location/opponent name.

Netminder and the two awards are grouped together in the schema (`checkGameRefs`'s `AWARD_FIELDS`, the roster-removal blocking message) because they're all "roster-scoped, clearable, single-player" fields — but that's a validation/data-shape similarity, not a conceptual one. Netminder is a factual detail of who played (like date or location); Player of the Game and Warrior of the Game are awards with a derived season count. The UI should follow the conceptual grouping, not the schema's incidental one.

## Goals / Non-Goals

**Goals:**
- Let an admin set, change, or clear the netminder from the game-details form, and the two awards from a separate awards form, each choosing only from the game's current roster.
- Surface the current selections on `/games/[id]`, with the netminder shown alongside the other game details and the two awards under their own "Awards" heading.
- Cover the "changing an award moves the count between players" behavior with an E2E test, since the underlying stats derivation already has unit coverage but no UI path has ever exercised it end-to-end.

**Non-Goals:**
- No changes to `GameSchema`, `checkGameRefs`, roster-removal blocking, or `derivePlayerSeasonStats` — all already correct and tested regardless of which form sets a field. (`updateGame` itself needed a fix — see Decisions.)
- No constraint preventing the same player from holding more than one of netminder/Player of the Game/Warrior of the Game — nothing in the ticket or existing schema requires exclusivity.
- No change to the roster picker's scope rules (`RosterForm`'s active-players-superset behavior is untouched).

## Decisions

**Netminder lives on `/games/[id]/edit` (game details); Player of the Game and Warrior of the Game live on their own `/games/[id]/awards` route.**
Initial design put all three on one awards form, grouped by their shared schema/validation shape (`AWARD_FIELDS`). Revised after review: netminder isn't an award — it has no derived season count, nothing is "won" — it's a fact about the game, same category as date/season/type/location. Splitting them means each form's name accurately describes what it edits, and the game detail page can show netminder next to the other game facts instead of implying it's a third award.

**Awards form (`/games/[id]/awards`), separate from `/games/[id]/edit`.**
Still mirrors the roster/details split already in the codebase for the two remaining fields. Keeps this form's schema/parsing single-purpose (two roster-scoped selects, nothing else).

**Netminder added to the existing `GameForm.tsx`/`updateGameAction`, not a third route.**
A dedicated `/games/[id]/netminder` route for a single field would be more indirection than the field warrants — it's one selector alongside four other already-editable facts. `GameForm.tsx` gains an optional `rosterPlayers` prop (populated only in edit mode, since a netminder can only be chosen once the game has a roster) and renders the netminder select only when `isEdit` is true. `parseGameDetailsFormData`/`updateGameAction` gain the same "always submit, empty means clear" handling already used for awards.

**Own action (`updateGameAwardsAction`) for the two awards, not extending `updateGameAction`'s patch.**
Same "one concern per form/action" reasoning already applied to roster vs. details. This is now a two-field form/action instead of three.

**Picker is `game.team.roster` only, not the roster ∪ active-players superset `RosterForm` uses.**
`RosterForm`'s superset exists because that form can *add* players. Netminder and both awards only ever select from players already on the roster (`checkGameRefs` requires it) — both `/games/[id]/edit` and `/games/[id]/awards` resolve `game.team.roster` to `Player` records directly, no new player-list plumbing beyond what each page already fetches.

**A shared `RosterSelect` component (`app/games/RosterSelect.tsx`), used by both the netminder field and the awards form.**
Same widget — a labeled, roster-scoped `<select>` with a "None" clearing option — needed in two now-separate forms. Extracted rather than duplicated. Uses the codebase's existing convention for an optional select's clear option (`"None"`, per `GoalForm.tsx`'s assist fields), not the em-dash-styled placeholder from this design's first draft.

**"Manage awards" link always shown; empty-roster state handled inside the awards page.**
Consistent with how `/games/[id]/roster` behaves with zero players today. The awards page renders a "Add players to the roster first" message instead of empty selects when `game.team.roster` is empty. The netminder field doesn't get equivalent special-casing — it's one field embedded in an already-multi-field form (same as `GoalForm.tsx`'s assist selects), not a page whose sole purpose is roster-scoped selection.

**`updateGame`'s `GameUpdateInput` needed a `null`-vs-`undefined` clear sentinel — discovered during implementation, not anticipated by this design's original non-goals.**
`updateGame`'s merge logic treats `undefined` as "leave this field unchanged" for every field (`...(patch.field !== undefined && { field: patch.field })`). That convention has never been exercised for a genuinely clearable field before — date/season/type/location/roster/opponentName are never unset, only replaced. Verified directly (via the `bson`/`mongodb` packages in `node_modules`): the Node MongoDB driver defaults `ignoreUndefined: false`, so if `updateGame` ever assigned `netminderPlayerId: undefined` onto the merged document, `replaceOne` would serialize it as BSON `null` — which `GameSchema`'s `z.string().optional()` rejects, so the very next `getGame` call would throw. Fixed by giving `GameUpdateInput`'s three fields the type `string | null | undefined` (`undefined` = unchanged, `null` = explicitly clear) and having `updateGame` `delete` the key from the merged object on `null` rather than ever setting it to `undefined`. Confirmed against a real local MongoDB with a new integration test (`updateGame award fields` in `tests/integration/repositories/games.test.ts`): set → clear → re-read round-trips cleanly. Both `updateGameAction` (for netminder) and `updateGameAwardsAction` (for the two awards) always submit a full field state, so each maps an unselected value to `null`, not `undefined`.

## Risks / Trade-offs

- **[Risk]** `updateGameAction` and `updateGameAwardsAction` both duplicate some boilerplate (fetch game, parse, call `updateGame`, revalidate, redirect), now joined by a third near-identical action shape. → **Mitigation**: accepted — matches the existing per-concern action style rather than introducing a shared abstraction the call sites don't yet justify.
- **[Risk]** Awards/netminder form failure mode differs from roster's (roster can partially fail with blocked players; these can't fail once the picker only offers rostered ids). → **Mitigation**: none needed — a `<select>` can't submit an id that isn't rostered, so `checkGameRefs`'s membership check becomes dead-code-safe validation rather than a reachable error path from either form. It stays as defense-in-depth for direct/tampered submissions.

## Migration Plan

Additive UI-only change; no data migration. No rollback concerns beyond reverting the new route/actions/links/form field.
