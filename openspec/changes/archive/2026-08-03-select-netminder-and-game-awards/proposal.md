## Why

Games already track goals, assists, and penalties, but nothing lets an admin record who played in net or who won the two post-game awards — even though the schema (`netminderPlayerId`, `manOfTheMatchPlayerId`, `warriorOfTheGamePlayerId`), roster-removal blocking, and player season stat counts for both awards were already built in earlier tickets (KAN-19/KAN-20) and are sitting unused. KAN-23 closes that gap: it's the "give the admin a place to click" ticket, not new plumbing.

Netminder is a factual detail of the game (who played in net), not an award — unlike Player of the Game and Warrior of the Game, it has no derived season count and nothing to "win." It's edited alongside date/season/type/location on the existing game-details form, not on the awards form.

## What Changes

- Add a "Netminder" selector to the existing `/games/[id]/edit` (game-details) form, populated from the game's current roster, clearable back to unset. `updateGameAction` persists it alongside the other detail fields.
- Add a `/games/[id]/awards` form, following the same "own route" pattern as `/games/[id]/roster`, with two independent selects — Player of the Game, Warrior of the Game — each populated from the game's current roster and each clearable back to unset.
- Add an `updateGameAwardsAction` server action that validates the selections (must be rostered or unset) and persists them via the existing `updateGame` patch path.
- Add a "Manage awards" link on `/games/[id]`, alongside the existing "Edit details" and "Manage roster" links, always present; the awards page itself shows an empty-roster message when the game has no rostered players to pick from.
- Render the current netminder (in the main details block, alongside date/season/type/location) and the current Player of the Game/Warrior of the Game (under a separate "Awards" heading) on `/games/[id]`.
- Add an E2E journey covering: setting and clearing the netminder via the details form, setting both awards, reassigning an award from one rostered player to another (verifying the season count moves), and clearing an award (verifying the count returns to its prior value).

No schema or stats-derivation changes are needed — `checkGameRefs` roster validation, `derivePlayerSeasonStats` award counting, and the KAN-19 roster-removal blocking message already handle all three fields correctly regardless of which form sets them. `updateGame` did need a small fix (see design.md): its patch merge had no way to *clear* an optional field, only set or leave unchanged, which would have caused clearing an award (or the netminder) to corrupt the stored document.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `game-management`: adds the ability to set, change, and clear a game's netminder (via the game-details form) and its Player of the Game/Warrior of the Game (via a dedicated awards form), and to view all three on the game detail page.

## Impact

- New files: `app/games/RosterSelect.tsx` (shared roster-scoped, clearable `<select>`, used by both the netminder field and the awards form), `app/games/[id]/awards/page.tsx`, `app/games/AwardsForm.tsx`, plus matching `page.test.ts`s and an E2E spec (`e2e/select-netminder-and-game-awards.spec.ts`).
- Modified files: `app/games/actions.ts` (`updateGameAction` gains netminder; new `updateGameAwardsAction` for the two awards), `app/games/form-parsing.ts` (`parseGameDetailsFormData` gains netminder parsing; new `parseGameAwardsFormData` for the two awards), `app/games/GameForm.tsx` (netminder selector, edit mode only), `app/games/[id]/edit/page.tsx` (now resolves and passes roster players), `app/games/[id]/page.tsx` (netminder shown in the details block, "Awards" section for the other two, "Manage awards" link), `lib/repositories/games.ts` (`GameUpdateInput`'s three award/netminder fields gain a `null` clear sentinel; see design.md).
- No changes to `lib/schemas` or `lib/derived`.
