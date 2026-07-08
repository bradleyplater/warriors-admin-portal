## Why

The portal currently has no database or object storage — `npm run dev` serves the shell only. Every subsequent phase (players, games, stats, publish) needs a local MongoDB and an S3-compatible bucket to build and test against, and per the PRD, moving to production must be nothing more than a connection-string swap. KAN-9 delivers that local stack now so later phases aren't blocked on infra work.

## What Changes

- Add `docker-compose.yml` with two services: `mongo` (`mongo:7`, port 27017) and `minio` (`minio/minio`, ports 9000/9001).
- Add a one-shot bucket-init step (e.g. `mc` container) that creates the `warriors-local` bucket on first `docker compose up`.
- Add named volumes for both services so data survives a service restart.
- Add a committed `.env.example` with `MONGODB_URI`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` set to the local Docker defaults.
- Add a minimal Mongo client wrapper and S3 client wrapper (`lib/mongodb.ts`, `lib/s3.ts`) that read those env vars — thin connection plumbing only, no repositories or business logic.
- Add a startup health check that verifies the app can reach both services, surfaced via a route (e.g. `/api/health`) checked when the app starts in local dev.

Explicitly out of scope (owned by KAN-10): seed data, `mongo-seed` compose service, `npm run db:reset`, and the local-only guard rail on destructive commands. No edits to `docs/06-local-development.md` — it already documents the target state accurately.

## Capabilities

### New Capabilities
- `local-docker-environment`: Docker Compose stack (MongoDB + MinIO), env-var wiring, and a health check proving the app can reach both services.

### Modified Capabilities
(none — no existing capability's requirements change)

## Impact

- New files: `docker-compose.yml`, `.env.example`, `lib/mongodb.ts`, `lib/s3.ts`, a health-check route.
- New dependencies: official `mongodb` driver, `@aws-sdk/client-s3` (per [02-architecture.md](../../../docs/02-architecture.md)).
- No changes to existing app pages or docs.
