## Context

`lib/repositories/games.ts` already has `updateGame(id, patch)`, which merges a `GameUpdateInput` (date, seasonId, type, location, roster, opponentName, award fields) onto the existing document, re-validates the whole thing with `GameSchema`, and `replaceOne`s it. `GameSchema`'s `checkGameRefs` superRefine already rejects any document where a goal/assist/penalty offender/award points at a player not in `team.roster` — so roster-removal safety is already enforced at the schema level, just not surfaced usefully: today it would appear as an opaque, generically-worded Zod issue (e.g. "Scorer must be on the roster") that also rejects the *entire* submission, including any other players in the same request who were safe to remove.

The player-edit precedent (`/players/[id]/edit`, KAN-16) established the shape for this kind of work in this codebase: a shared create/edit form component, a domain error class in `lib/repositories/internal/errors.ts` (`DuplicateShirtNumberError`) thrown by the repository and caught by the server action, mapped to a field-level error via the same `FieldErrors` rendering every form in this app already uses.

## Goals / Non-Goals

**Goals:**
- Let an admin correct date/season/opponent/type/location on an existing game.
- Let an admin add and remove rostered players on an existing game.
- Block removal only of the specific player(s) still referenced elsewhere in the game document, while applying every other requested change (other removals, additions) in the same submission.
- Report exactly what still references a blocked player, naming goal/assist/penalty counts and the specific award (netminder / Man of the Match / Warrior of the Game), not a generic message.

**Non-Goals:**
- Editing goals, assists, penalties, or awards themselves — no such UI exists yet (a later ticket); this change only touches `date`, `seasonId`, `type`, `location`, `opponentTeam.name`, and `team.roster`.
- Any change to how games-played is computed or displayed — `/players/[id]` already derives it live from `listGames()` roster membership; a roster edit is automatically reflected with no new code.
- Combining details-edit and roster-edit into one form (explicitly rejected — see Decisions).

## Decisions

### One combined edit form vs. two separate surfaces
**Decision:** Two separate routes/forms: `/games/[id]/edit` (details only) and `/games/[id]/roster` (roster only).

Two reasons, both concrete:
1. The player pool each surface needs differs. The details form needs no player data at all. The roster form needs *currently-rostered ∪ active* players — a superset of the create form's active-only picker, because a game can have rostered players who have since gone inactive; they must remain visible and removable on this surface even though they'd never appear on `/games/new`'s picker.
2. The roster form's submit behavior is genuinely different from every other form in this app (see next decision) — it can partially succeed and stay on the page rather than redirect. Keeping that behavior isolated to its own route avoids a single form/action having two different success semantics depending on which fields changed.

**Alternative considered:** one combined form (mirroring `PlayerForm`, which does everything in one place). Rejected because it would force the "sometimes redirects, sometimes doesn't" behavior onto basic field edits too, and would need the rostered∪active player list loaded even when the admin is only fixing a typo in the opponent name.

### Roster removal: reject-the-whole-submission vs. block-only-the-offender
**Decision:** Block only the offending removal(s). Every other change in the same submission — other removals, any additions — is applied.

This is the substantive design choice in this change. It means the roster write is a **partial-success** operation: given a requested roster, the repository computes which removals are safe, applies the full delta (safe removals + all additions), and separately reports which requested removals didn't happen and why.

**Alternative considered:** reject the whole submission if any removal is blocked (matching `checkGameRefs`'s current all-or-nothing behavior, and consistent with `DuplicateShirtNumberError`'s throw-before-any-write shape). Rejected per explicit product decision: an admin removing five players where one is still blocked shouldn't have to fix the blocked one before the other four take effect.

### How the domain error carries the partial-success outcome
**Decision:** `updateGameRoster(gameId, requestedRoster)` in `lib/repositories/games.ts`:

```
removed        = existingRoster − requestedRoster
blocked        = removed players still referenced by a goal/assist/penalty/award
appliedRoster  = requestedRoster ∪ blocked   // blocked players are added back in
validated      = GameSchema.parse({ ...existing, team: { ...existing.team, roster: appliedRoster } })
write validated (this always succeeds — appliedRoster never contains an
  orphaned reference, since every blocked player was added back)
if blocked.length > 0:
  throw new RosterPlayerReferencedError(blocked)   // thrown AFTER the write commits
return validated  // only reached when nothing was blocked
```

`RosterPlayerReferencedError` carries structured per-player data, not a pre-formatted message:

```ts
interface BlockedRosterPlayer {
  playerId: string;
  goalCount: number;      // as scorer
  assistCount: number;    // as assist1 or assist2
  penaltyCount: number;   // as offender
  isNetminder: boolean;
  isManOfTheMatch: boolean;
  isWarriorOfTheGame: boolean;
}
class RosterPlayerReferencedError extends Error {
  readonly blocked: BlockedRosterPlayer[];
}
```

The action (`app/games/actions.ts`) catches it and builds the human message there, since it — unlike the repository — already has the player list loaded to render names/numbers on the roster picker: e.g. "#9 J. Smith can't be removed — they scored 2 goals, recorded 1 assist, and were netminder for this game." Award names are specific (netminder / Man of the Match / Warrior of the Game), never a generic "an award."

**Why throw after the write, not before:** the write must commit the safe part of the request regardless of whether anything was blocked. Throwing is still the right signal to the action layer — it's what distinguishes "fully applied" from "partially applied, here's the leftover state to show" — it just means the action can't treat the catch block as "nothing happened, let the user retry the same submission," which every other catch block in this app currently assumes.

**Alternative considered:** return a discriminated-union result (`{ ok: true, game } | { ok: false, game, blocked }`) instead of throwing. This would avoid the "throw after a successful write" oddity, but breaks from the `DuplicateShirtNumberError`/`try-catch` convention every other repository function in this codebase uses, for a case that isn't actually a failure in the traditional sense. Rejected in favor of staying consistent with the established pattern, accepting the "throws after commit" wrinkle as a documented exception.

### Action behavior on partial success: redirect or stay?
**Decision:** On the roster route, a caught `RosterPlayerReferencedError` does **not** redirect. The action calls `revalidatePath` (so the page reflects the roster write that already happened) and returns form state with the blocked-player messages, staying on `/games/[id]/roster`. Full success (nothing blocked) redirects to `/games/[id]`, matching every other action in the app.

This is a new interaction shape for this codebase — every existing action is either full-success-and-redirect or full-failure-and-stay. It's necessary here because the admin needs to see which players remain (and why) to decide their next step (typically: go find and remove the referencing goal/penalty/award first).

## Risks / Trade-offs

- **New interaction shape** (partial success, stay on page) → only one route in the app; contained to `app/games/actions.ts`'s roster action, doesn't ripple into other forms.
- **Throwing after a write commits is unusual** and could mislead a future reader into assuming a thrown error means nothing happened → mitigated with a comment at the throw site in `updateGameRoster` and by this design doc.
- **Message composition split across layers** (repository computes counts, action composes prose) → mirrors nothing existing exactly, but keeps player-name resolution (which needs the player list) out of the repository layer, consistent with how the repository has no player-lookup dependency today.

## Migration Plan

No data migration. Additive routes and one new repository function; existing `updateGame` is reused as-is for the details form. No rollback concerns beyond reverting the change.
