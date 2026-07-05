## 1. Docker Compose stack

- [ ] 1.1 Add `docker-compose.yml` with `mongo` (`mongo:7`, port 27017) and `minio` (`minio/minio`, ports 9000/9001) services
- [ ] 1.2 Add named volumes for `mongo` and `minio` data directories
- [ ] 1.3 Add a one-shot `mc` init service that creates the `warriors-local` bucket (`mc alias set` + `mc mb --ignore-existing`), depending on `minio` being healthy
- [ ] 1.4 Verify `docker compose up -d` twice in a row (fresh volume, then again) starts cleanly both times and the bucket exists after each

## 2. Environment configuration

- [ ] 2.1 Add `.env.example` with `MONGODB_URI`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` set to the local Docker defaults
- [ ] 2.2 Confirm `.env.local` (gitignored) is the expected copy target and matches what `.env.example` documents

## 3. Client wrappers

- [ ] 3.1 Add `mongodb` and `@aws-sdk/client-s3` as dependencies
- [ ] 3.2 Add `lib/mongodb.ts`: cached `MongoClient`/`Db` getter reading `MONGODB_URI`
- [ ] 3.3 Add `lib/s3.ts`: configured `S3Client` reading `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

## 4. Health check

- [ ] 4.1 Add `GET /api/health` route handler that pings MongoDB (`db.command({ ping: 1 })`) and checks S3 (`HeadBucket` on `S3_BUCKET`)
- [ ] 4.2 Return per-service status (e.g. `{ mongo: "ok" | "error", s3: "ok" | "error" }`) with a non-200 status if either service fails
- [ ] 4.3 Verify the route reports success with the Docker stack up, and reports failure for the affected service when a container is stopped

## 5. Verification

- [ ] 5.1 Fresh-clone walkthrough: `docker compose up -d` → `cp .env.example .env.local` → `npm install` → `npm run dev` → `/api/health` reports both services healthy
- [ ] 5.2 Restart check: write test data to Mongo and an object to the bucket, restart both containers, confirm both persist
- [ ] 5.3 Confirm no edits were made to `docs/06-local-development.md`
