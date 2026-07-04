# 05 — Testing Strategy

Three tiers, all runnable locally and in CI. The goal stated in the PRD is a *foolproof* system — the tests are what makes "foolproof" verifiable rather than hopeful.

## Tier 1 — Unit tests (Vitest)

Fast, no I/O. The highest-value target is the **stats engine**, because it replaces every hand-maintained number in the old system:

- Player season aggregation: games played, goals, assists, points, PIMs, award counts — including players with zero involvement and players appearing only in assists.
- Team aggregation, including bench-penalty PIMs (offender `BENCH`).
- Score derivation: totals from goals; period bucketing at the boundaries (19:59 vs 20:00); shootout handling (SO goals excluded from periods, +1 to the winner).
- Validation rules from [03 — Data Model](03-data-model.md): number range/uniqueness, assist distinctness, roster-membership rules, blocked roster removal when references exist.
- Position-string migration mapping (all 8 real-world spellings).
- JSON artifact generators against the golden fixtures from Phase 0.

## Tier 2 — Integration tests (Vitest + Dockerised MongoDB)

Run against a real MongoDB (Testcontainers or the dev `docker compose` service) seeded per-test:

- Repository CRUD with the custom string-ID scheme (including ID-collision retry).
- Server actions end to end: create player → create game → add goals/penalties → computed stats correct in one round trip.
- **Migration scripts**: each script's dry-run output and real run, executed against a seed that reproduces production's edge cases (drifted aggregates, 8 position spellings, numbers > 99, missing award fields, `challenge` casing, bench penalties, shootout goals). Idempotency: running each script twice produces identical results.
- Reconciliation report: seeded drift must be detected and reported exactly.
- Publish service against MinIO (S3-compatible, in Docker): artifacts generated, checksummed, uploaded, `Publishes` document recorded, unchanged files skipped.

## Tier 3 — End-to-end tests (Playwright)

Chosen over Cypress (agreed): faster, less flaky, first-class trace viewer, and **UI mode + recorded videos** give the "watch the site being used" experience the PRD asks for.

Runs against the full stack: `next dev`/`next start` + Docker MongoDB (seeded) + MinIO.

Core journeys:

1. **Player lifecycle** — create a player (multi-position, number validation rejects 0/100/duplicates), edit them, deactivate them, see them excluded from new-game roster pickers.
2. **Game entry, the big one** — create a game (date, season, opponent, type, location, roster) → verify every rostered player's games played incremented on their player page → add goals with assists → verify scorer/assist/points stats → add a bench penalty and a player penalty → verify PIMs → set netminder and both awards → verify the derived score and period line shown on the game page.
3. **Roster edit** — remove a player with no involvement (games played decrements); attempt to remove the scorer of a goal (blocked with message).
4. **Goal/penalty editing** — change a goal's scorer, verify both players' stats move; delete a penalty, verify PIMs.
5. **Opponent events** — opponent goals/penalties by name; verify no Warriors stats change.
6. **Publish flow** — make a change, see the unpublished-changes indicator, publish, verify the indicator clears and the JSON in (Mini)S3 matches the expected artifact.
7. **Migration review screens** — active-flag checklist and renumbering flow (against a seed with out-of-range numbers).

Configuration: `video: 'on'` and `trace: 'retain-on-failure'` so every run is watchable; `npx playwright test --ui` for interactive watching during development.

## CI

GitHub Actions on every push/PR: lint + typecheck → unit → integration (services via Docker) → Playwright (artifacts: videos, traces, HTML report). A PR cannot merge red.

## Seed data

One shared seed module (used by local dev, integration tests, and Playwright) that mirrors production's *shapes and edge cases* with fictional players — see [06 — Local Development](06-local-development.md). Edge cases are enumerated in the module so a new production quirk becomes a new seed entry + test.
