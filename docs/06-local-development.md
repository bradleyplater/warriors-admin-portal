# 06 — Local Development

Per the PRD: local development spins up Docker services with seeded data, and moving to production is nothing more than switching the connection string.

## Services (`docker-compose.yml`)

| Service | Image | Port | Purpose |
|---|---|---|---|
| `mongo` | `mongo:7` | 27017 | Local `HockeyTracker` database |
| `minio` | `minio/minio` | 9000 / 9001 | S3-compatible storage so the publish pipeline runs for real locally |
| `mongo-seed` | one-shot node script | — | Seeds the database on first run |

## First run

```bash
cp .env.example .env.local   # defaults already point at the Docker services
docker compose up -d
npm install
npm run dev                  # http://localhost:3000
```

`mongo-seed` only writes if the database is empty. Reset any time:

```bash
npm run db:reset   # drops HockeyTracker and re-seeds
```

## Seed data

One shared seed module (`seed/`) used by local dev, integration tests, and Playwright. It mirrors the production data's shapes and edge cases with fictional players:

- 4 seasons (`SSN2223`…`SSN2526`), 1 team.
- ~20 players covering: every position combination, active and inactive, a player with a nickname and image URL, and (for migration testing) legacy-shaped documents with old `position`/`teams`/`stats` fields, the 8 real-world position spellings, and numbers > 99.
- ~10 games covering: all game types, home/away, bench penalties, goals with 0/1/2 assists, every goal type including shootout, games with and without awards/netminder.
- Deliberately drifted legacy aggregates so the reconciliation report has something to find in tests.

## Environment switching

Everything environment-specific is in env vars (see [02 — Architecture](02-architecture.md#configuration)). `.env.local` targets Docker; production supplies its own values:

```
MONGODB_URI=mongodb://localhost:27017/HockeyTracker
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=warriors-local
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

Swap `MONGODB_URI` (and the S3 values) for the production ones and the same build talks to the real database and bucket — no code changes. **Guard rail:** the migration/seed/reset commands refuse to run when the URI does not look local unless `--allow-remote` is passed explicitly, so a copied command can never wipe production.

## Useful commands (planned)

| Command | Does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run db:reset` | Drop + re-seed local DB |
| `npm run test` | Unit tests |
| `npm run test:integration` | Integration tests (needs Docker up) |
| `npm run test:e2e` / `test:e2e:ui` | Playwright headless / UI mode |
| `npm run migrate -- --dry-run` | Migration scripts in dry-run |
| `npm run publish:preview` | Generate JSON artifacts locally without uploading |
