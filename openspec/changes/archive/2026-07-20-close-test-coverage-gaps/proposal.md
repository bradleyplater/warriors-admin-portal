## Why

A post-merge review of KAN-18 (Create a game) found that several pieces of implemented behavior — a 404 for unknown ids, a fix for a page freezing to build-time data, nested validation-error mapping, season ordering — were marked "done" because the code existed, not because a test proved the behavior. A retrospective audit of every exported function in `lib/`, `app/`, and `seed/` against the existing test suite found four more of the same shape beyond the five originally reported. Closing those gaps one-by-one without changing what "done" means would leave the same failure mode in place for the next change. This change closes the ten identified gaps and, in the same motion, adds the rule those tests are the proof of — so that future changes are held to it automatically rather than by memory.

A separate bug (`/players` page has the identical build-time-freeze bug already fixed for `/games`, found during this same audit) has been split out to KAN-45 — it is a behavior fix, not a test gap, and is explicitly out of scope here.

## What Changes

- Add unit tests for `sortSeasonsAscending` (`lib/derived/season-order.ts`), `mapFieldErrors`/`fieldKeyFor`/`parseGameFormData` (`app/games/actions.ts`), and `parsePlayerFormData`/`optionalString` (`app/players/actions.ts`) — six pure-logic functions with no direct test today.
- Add tests proving `notFound()` renders a 404 for an unknown id on `/games/[id]`, `/players/[id]`, and `/players/[id]/edit`.
- Add an E2E regression test proving `export const dynamic = "force-dynamic"` on `/games` and `/games/new` is load-bearing: a game/player created after the server is already running (against a production build) must appear without a rebuild.
- Add E2E validation-failure coverage for `/games/new`, mirroring the four rejection-path tests `e2e/create-player.spec.ts` already has for `/players/new` (currently `e2e/create-game.spec.ts` has none).
- Add a new requirement to the `automated-testing` capability defining what test coverage a change needs before a task counts as done: a direct unit test for any exported function outside the schema/repository layers that contains branching logic, a not-found-path test for any page with an error/404 branch, and a freshness test for any page reading live data without a dynamic route segment.
- Document the previously-implicit 404 and freshness behaviors as formal requirements in the capabilities that own them (`game-management`, `player-profile`, `player-management`), since they exist in shipped code today but were never specified.
- All ten tests are written to fail against the current codebase before any test-only code changes make them pass, as the first demonstration that the new coverage rule works.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `automated-testing`: adds a requirement defining minimum required test coverage for new work (direct unit tests for branching pure functions; not-found-path tests; freshness tests for live-data pages without a dynamic segment).
- `game-management`: adds requirements documenting that `/games/[id]` 404s on an unknown id, and that `/games` and `/games/new` reflect data created after server start without a rebuild.
- `player-profile`: adds a requirement documenting that `/players/[id]` 404s on an unknown id.
- `player-management`: adds a requirement documenting that `/players/[id]/edit` 404s on an unknown id.

## Impact

- Test files: new/modified `lib/derived/season-order.test.ts`, `app/games/actions.test.ts`, `app/players/actions.test.ts`, `e2e/create-game.spec.ts`, plus new not-found and freshness test files (unit and/or e2e depending on the page).
- Spec files: `openspec/specs/automated-testing/spec.md`, `openspec/specs/game-management/spec.md`, `openspec/specs/player-profile/spec.md`, `openspec/specs/player-management/spec.md`.
- No production code changes are anticipated — this change is test-only plus spec documentation. If any of the ten tests fail to pass without a production fix, that finding gets split into its own bug ticket the same way KAN-45 was, rather than silently expanding this change's scope.
- Jira: KAN-44 (this change). KAN-45 (the split-out `/players` freeze bug) is explicitly out of scope.
