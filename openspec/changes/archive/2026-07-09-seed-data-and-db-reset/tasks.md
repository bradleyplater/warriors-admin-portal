## 1. Seed module scaffolding

- [x] 1.1 Add `tsx` as a devDependency
- [x] 1.2 Add `seed/types.ts` with local, seed-only TypeScript types for Season, Team, Player, Game (including the legacy fields used by drift fixtures)
- [x] 1.3 Add `seed/ids.ts`: local `genId(prefix)` helper (prefix + 6 random digits, collision-checked within one run)
- [x] 1.4 Add `seed/guard.ts`: `assertLocalOrAllowed(uri, argv)` shared by seed and reset, allow-listing `localhost` / `127.0.0.1` / `mongo`, bypassed by `--allow-remote`

## 2. Fixture data

- [x] 2.1 Add `seed/data/seasons.ts`: 4 seasons (`SSN2223`…`SSN2526`)
- [x] 2.2 Add `seed/data/team.ts`: 1 team, target-shape identity fields plus legacy `players[]`/`stats[]` arrays with deliberately drifted values
- [x] 2.3 Add `seed/data/players.ts`: ~20 players covering every position/position-combination, active and inactive, nickname example, image URL example, and at least one player with legacy fields (`position`, `teams`) alongside target-shape fields
- [x] 2.4 Add `seed/data/games.ts`: ~10 games covering every game type, home/away, bench penalties, 0/1/2-assist goals, every goal type including shootout, and games with and without netminder/awards

## 3. Seed and reset entry points

- [x] 3.1 Add `seed/run.ts` exporting `runSeed()`: checks `seasons`/`team`/`players`/`games` are all empty, inserts fixture data if so, otherwise logs and no-ops
- [x] 3.2 Add a CLI entry point (`npm run db:seed`) that calls `assertLocalOrAllowed` then `runSeed()`
- [x] 3.3 Add a reset script (`npm run db:reset`) that calls `assertLocalOrAllowed`, then `db.dropDatabase()`, then `runSeed()`
- [x] 3.4 Add both scripts to `package.json`

## 4. Docker integration

- [x] 4.1 Add a `mongo-seed` one-shot service to `docker-compose.yml`: depends on `mongo` being healthy, runs `npx tsx seed/run.ts` (via `db:seed`) with `MONGODB_URI=mongodb://mongo:27017/HockeyTracker`, exits after completion
- [x] 4.2 Verify `docker compose up -d` on a fresh volume seeds the database exactly once, and running it again does not duplicate or error

## 5. Verification

- [x] 5.1 Fresh-volume run: confirm `seasons`, `team`, `players`, `games` are populated per the fixture counts and combinations in the spec
- [x] 5.2 Re-run `npm run db:seed` against the now-populated database: confirm it no-ops and makes no writes
- [x] 5.3 Run `npm run db:reset`: confirm the database is dropped and re-seeded identically
- [x] 5.4 Guard rail: confirm `db:seed`/`db:reset` refuse to run against a non-local `MONGODB_URI` without `--allow-remote`, and proceed when it's passed
- [x] 5.5 Confirm no edits were made to `docs/06-local-development.md`
