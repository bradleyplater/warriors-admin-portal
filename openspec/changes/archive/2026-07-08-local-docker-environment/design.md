## Context

The portal has no data or storage layer yet — just the Next.js shell from the KAN-8 scaffold. Per the PRD and [02-architecture.md](../../../docs/02-architecture.md), production and local dev must run identical code, differing only in env vars. KAN-10 (seed data, `db:reset`) is a separate, later ticket — this design deliberately stops short of anything that touches seed data or destructive commands.

## Goals / Non-Goals

**Goals:**
- One command (`docker compose up -d`) brings up MongoDB and MinIO with the `warriors-local` bucket already created.
- The app can prove connectivity to both services at startup via a health check, without any repository or business logic existing yet.
- Data in both services survives a container restart.
- Switching to production is purely an env-var swap — no code changes.

**Non-Goals:**
- Seed data, `mongo-seed` service, `npm run db:reset` (KAN-10).
- Any repository layer, Zod schemas, or player/game business logic (later phases).
- Editing `docs/06-local-development.md` (already accurate).
- Auth, CDN invalidation, or publish pipeline concerns.

## Decisions

**MinIO bucket creation via one-shot `mc` container.** MinIO doesn't create buckets on boot. Use the official pattern: a `minio/mc` service in `docker-compose.yml` that depends on `minio`, runs `mc alias set` + `mc mb --ignore-existing`, and exits. Alternative considered: creating the bucket lazily from app code on first S3 call — rejected because it would mean the app's client wrapper carries bucket-provisioning logic that has nothing to do with production (buckets there are provisioned out-of-band).

**Thin client wrappers, not repositories.** `lib/mongodb.ts` exports a cached `MongoClient`/`Db` getter; `lib/s3.ts` exports a configured `S3Client`. Both just read env vars and connect — no collection-specific methods. This satisfies "the app connects using values from a committed example env file, with no code changes" without pulling forward the repository layer, which belongs to the players/games phases per [07-build-roadmap.md](../../../docs/07-build-roadmap.md).

**Health check as a route handler, checked at dev startup.** A `GET /api/health` route pings Mongo (`db.command({ ping: 1 })`) and S3 (`HeadBucket` on `warriors-local`), returning per-service status. "Checked at startup" means a developer following the README hits this route (or it's hit automatically, e.g. via a `predev` script curling it once services are confirmed up) as the proof-of-connectivity step — not a blocking pre-flight that prevents `next dev` from booting, since Next.js has no first-class server-startup hook for this without custom server code, which the architecture doc rules out (host-agnostic, standard `next build` output). Alternative considered: a custom server wrapping Next.js to run checks before listening — rejected, contradicts the "standard `next build` output" principle in 02-architecture.md.

**Named volumes for both services.** `mongo-data` and `minio-data` volumes, declared in `docker-compose.yml`, mounted at each image's default data directory. Satisfies "data survives a service restart" (`docker compose restart` / `down` without `-v` / `up -d` again).

## Risks / Trade-offs

- **Health check isn't a true boot-blocking gate** → Mitigated by documenting in the route's own behavior (returns 503 per-service) that developers/CI can poll it; acceptable since KAN-9's AC only requires the app *can* connect, not that it refuses to start otherwise.
- **`mc` init container adds a third compose service before KAN-10 adds a fourth (`mongo-seed`)** → Acceptable; each is independently a one-shot, non-blocking job matching the pattern docs/06 already documents.
- **Client wrappers with no consumers yet** → Health check route is the only consumer until later phases; kept intentionally minimal so it doesn't accumulate scope that belongs to KAN-10 or Phase 2+.

## Open Questions

None outstanding — scope was confirmed with the ticket owner before this design was written.
