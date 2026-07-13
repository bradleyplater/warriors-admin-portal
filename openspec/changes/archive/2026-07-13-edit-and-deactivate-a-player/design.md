## Context

`PlayerForm` (`app/players/PlayerForm.tsx`) and `createPlayerAction` (`app/players/actions.ts`) already implement the full create flow, validated against `PlayerCreateInputSchema`. The repository layer already has `updatePlayer(id, input)` (`lib/repositories/players.ts:48`), which stamps `updatedAt`, applies a `$set` of whatever fields are passed, and translates the active-player unique-number index violation into `DuplicateShirtNumberError` — same as `createPlayer`. The roster table at `/players` currently renders rows with no per-row interaction (`openspec/specs/roster-list/spec.md:33`: rows are not links).

## Goals / Non-Goals

**Goals:**
- Let an admin reach an edit form for any player from the roster table.
- Reuse the create form's fields, layout, and validation instead of duplicating them.
- Make `active` an editable field so deactivate/reactivate is just a normal edit.
- Block reactivation into a taken number using the error path that already exists.

**Non-Goals:**
- Roster-picker exclusion — no game-creation UI exists to exclude a player from.
- Partial/PATCH-style editing of individual fields — the edit form submits the full record, same as create.
- Soft-delete or audit trail of who deactivated whom — `active: false` plus the existing `updatedAt` stamp is sufficient for this ticket.

## Decisions

**Full-form resubmit, not a partial PATCH.** The edit form pre-fills every field and submits all of them on save, exactly like create. `updatePlayer` accepts `Partial<PlayerCreateInput>`, but the UI always sends the complete parsed object. This avoids a second "diff-only" validation path and keeps `PlayerForm` a single component driven by an `initialValues`/`mode` prop rather than two divergent forms.

**Route: `/players/[id]/edit`.** Matches the existing `/players/new` sibling pattern rather than a query-param or modal approach, and gives the edit form its own bookmarkable URL and its own server component to load the player via `getPlayer(id)`.

**Row-level edit affordance: icon-only link, not a row click.** `roster-list`'s existing requirement that rows aren't clickable stays in force for the row itself; only a dedicated edit icon/button within the row links to `/players/[id]/edit`. This is a MODIFIED requirement (narrowing "no links in a row" to "no whole-row link"), not a reversal.

**`PlayerForm` gains a mode, not a fork.** Add `initialValues?: Player` and reuse the same field set; the submit action passed in differs (`createPlayerAction` vs `updatePlayerAction`) but validation, error rendering, and markup are shared. This keeps validation guaranteed identical between create and edit, per the existing "client and server validation share one schema" requirement.

**Duplicate number on reactivation surfaces exactly like duplicate number on create.** `updatePlayerAction` catches `DuplicateShirtNumberError` and returns it as a field-level error on `number`, mirroring `createPlayerAction`. No new error type or UI pattern needed.

## Risks / Trade-offs

- **Full-form resubmit risks clobbering fields if the pre-filled form is stale** (e.g. two admins editing concurrently) → Accepted for this ticket; no optimistic-lock/version field exists in the data model yet, and this is a low-traffic single-admin tool today.
- **Icon-only edit affordance may be missed by users used to row-click patterns** → Mitigated by using a conventional pencil/edit icon with a visible hit target and a title/aria-label.

