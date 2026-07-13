## Context

`/players` (`app/players/page.tsx`) is a Server Component that currently renders `PlayerForm` (a client component using `useActionState`) followed by a bare `<ul>` built from `listPlayers()`. `listPlayers()` already returns every player for the single team with no filtering — the data layer needs no changes. The `Player` schema (`lib/schemas/player.ts`) already carries every field the table needs: `number`, `firstName`, `surname`, `positions: Position[]`, `active`, `nickname?`.

Today, `createPlayerAction` (`app/players/actions.ts`) returns a `CreatePlayerFormState` (`errors`, `success`, `resetToken`) that `PlayerForm` uses to show an inline "Player created." message and remount itself via a `key={state.resetToken}` trick to clear inputs. This change replaces that flow with a server-side redirect, so most of that state shape becomes dead weight.

## Goals / Non-Goals

**Goals:**
- Render every player on `/players` in one glance, grouped by `active`, with number/name/position(s)/nickname visible per row.
- Separate "view the roster" from "create a player" into distinct routes (`/players` vs `/players/new`), each doing one job.
- Keep the create flow's validation and error-surfacing behavior (field-level errors via `PlayerCreateInputSchema`) unchanged — only the success path changes.

**Non-Goals:**
- No `/players/[id]` detail or edit route. Rows are visually inert (no `<a>`/`<Link>`) — hover styling only, as a visual placeholder for KAN-16.
- No filtering, sorting, search, or pagination controls.
- No player images or avatar rendering.
- No repository or schema changes — `listPlayers()` and `Player` already provide what's needed.

## Decisions

**Grouping via two server-rendered sections, not a client filter toggle.** `listPlayers()` results are partitioned into `active` / `inactive` arrays in the Server Component and rendered as two `<table>` blocks (or one table with two `<tbody>` groups) with section headings. No client component, no `useState`, matching the existing pattern where `/players` has no client interactivity beyond the form itself (which is moving out anyway). A filter/search UI was considered but nothing in the ticket or prior tickets asks for it, and it would require a client component wrapping the whole list.

**Sort order within each section: shirt number ascending.** Simplest deterministic order, matches how the seed data and existing minimal list are read, and needs no additional UI.

**`/players/new` as a full route, not a modal/inline toggle.** Keeps `app/players/page.tsx` as a plain read path (just `listPlayers()` + render), and keeps `PlayerForm`/`createPlayerAction` on their own route where a redirect on success is the natural Next.js pattern (`redirect("/players")` from the Server Action, per Next.js docs — this throws internally and is expected to be called outside `try/catch`, or with the error type-checked in `catch` and rethrown).

**Redirect-after-success replaces returned success state.** `createPlayerAction` calls `redirect("/players")` after a successful `createPlayer()` instead of returning `{ success: true, resetToken: n }`. This removes the need for `resetToken` and the remount trick entirely, since a fresh page load of `/players/new` naturally has empty inputs. `CreatePlayerFormState` shrinks to just `{ errors }`. Field-level error paths (validation failure, `DuplicateShirtNumberError`) are unchanged — the action still returns state (with errors) in those cases, it just never returns a `success: true` case.

**`revalidatePath` target.** The action currently revalidates `/players` after create; that stays correct since the redirect lands there and the list must reflect the newly written document.

**No new capability for the create-form relocation itself.** Moving `PlayerForm` to `/players/new` is an implementation detail of routing, not a new user-facing capability — the `player-management` capability's existing requirements (validation, duplicate-number handling, positions) are unchanged in substance, just relocated. Only the "Minimal player list" requirement is removed from `player-management` (superseded by `roster-list`) and the "successful submission" scenario's outcome changes from inline confirmation to redirect.

## Risks / Trade-offs

- **[Risk] Removing `resetToken`/inline success state is a larger diff to `PlayerForm.tsx` than a pure addition** → Mitigation: the component keeps all its validation/error-display logic; only the success branch and the `key={state.resetToken}` remount are deleted. Straightforward, mechanical change.
- **[Risk] E2E rewrite touches an already-passing spec (`create-player.spec.ts`)** → Mitigation: the assertions being replaced (inline "Player created." text) are exactly what's being removed by design; the new assertions (redirected URL, row present in the correct table section) are equally direct.
- **[Risk] Two `<table>` sections instead of one could look redundant if a team has zero inactive players** → Mitigation: acceptance criteria only requires distinguishing active/inactive, not handling the empty case specially; render the "Inactive" section with a "No inactive players" row (or omit the section) — left as a small implementation choice in tasks, not a spec requirement.

## Migration Plan

No data migration — purely a rendering/routing change. Deploy as a single change; no feature flag needed since there's no partial-rollout concern (internal admin tool, single environment cutover is fine).

## Open Questions

- None outstanding — all prior open threads (grouping style, button placement, redirect vs. stay, row click behavior) were resolved during exploration before this proposal was written.
