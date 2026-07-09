## Why

Every phase after this one (players, games, stats, publish, migration) needs realistic data to build and test against, and per [05-testing-strategy.md](../../../docs/05-testing-strategy.md) local dev, integration tests, and Playwright must all share one seed dataset rather than each inventing its own fixtures. KAN-9 deferred this deliberately so the docker stack could ship first; KAN-10 delivers the seed data and reset command now so Phase 2 (players) isn't blocked.

## What Changes

- Add a shared seed module (`seed/`) that inserts fictional data matching [03-data-model.md](../../../docs/03-data-model.md)'s target shapes: 4 seasons, 1 team, ~20 players (every position combination, active/inactive, nickname/image examples, legacy-shaped documents with old `position`/`teams`/`stats` fields and out-of-range numbers for migration testing), and ~10 games (all game types, home/away, bench penalties, 0/1/2-assist goals, every goal type including shootout, with and without netminder/awards).
- Add deliberately drifted legacy aggregate data (stale `team.players[]`/`team.stats[]`-style values) so the reconciliation report (KAN-37) has something to find in tests.
- Add a `mongo-seed` one-shot Docker Compose service that runs the seed module against an empty database only, per [06-local-development.md](../../../docs/06-local-development.md).
- Add an `npm run db:reset` command that drops the local database and re-seeds it.
- Add a local-only guard rail shared by seed and reset: both refuse to run unless `MONGODB_URI` looks local, unless `--allow-remote` is passed explicitly.

Explicitly out of scope (owned by other tickets):
- **KAN-13** (entity schemas, enums, validation rules): the seed module will use its own minimal, local TypeScript types for the documents it inserts — not a shared Zod schema layer. It does not validate data on the way in beyond what's needed to produce well-formed seed documents.
- **KAN-14** (data-access layer, ID generation, audit timestamps): the seed module will use a small local ID-generation helper (prefix + random digits, matching the `PLR######`/`GME######`/`SSN####`/`TM######` scheme) scoped to seeding only, and set `createdAt`/`updatedAt` directly — not the shared repository/ID-generation utility those tickets will introduce. Once KAN-13/KAN-14 land, the seed module is a natural candidate to move onto them, but that migration is not part of this change.
- Any derived-stats computation (KAN-25/26/27) — seeded games carry raw goals/penalties only.

## Capabilities

### New Capabilities
- `seed-data`: shared seed dataset (seasons, team, players, games, legacy/drift fixtures), the `mongo-seed` compose service, `npm run db:reset`, and the local-only guard rail protecting both.

### Modified Capabilities
(none — no existing capability's requirements change)

## Impact

- New files: `seed/` module (data + insert logic), `mongo-seed` service in `docker-compose.yml`, a `db:reset` script, a shared local-only guard-rail check.
- No new dependencies — uses the existing `mongodb` driver via `lib/mongodb.ts`.
- No changes to `lib/mongodb.ts`, `lib/s3.ts`, or `/api/health` (KAN-9).
- No edits to `docs/06-local-development.md` — it already documents the target state accurately.
