## 1. Unit testing (Vitest)

- [x] 1.1 Add Vitest and supporting devDependencies; add `test:unit` script and a Vitest config scoped to unit tests only (excludes `tests/integration`)
- [x] 1.2 Write `seed/guard.test.ts` covering `assertLocalOrAllowed()`: `--allow-remote` override, invalid URI, disallowed host, allowed host
- [x] 1.3 Verify `npm run test:unit` passes with no Docker services running

## 2. Integration testing (Vitest + Docker)

- [x] 2.1 Add a separate Vitest config/script (`test:integration`) that targets `tests/integration/`
- [x] 2.2 Write `tests/integration/health.test.ts` asserting `GET /api/health` returns `200` with `{ mongo: "ok", s3: "ok" }` against the real `docker-compose.yml` stack
- [x] 2.3 Document/verify the local run sequence: `docker compose up -d --wait` then `npm run test:integration` (found: `--wait` exits 1 even on success because of the one-shot `mongo-seed`/`minio-init` containers exiting after completion — CI workflow accounts for this, see 4.4)

## 3. End-to-end testing (Playwright)

- [x] 3.1 Add Playwright and supporting devDependencies; add `test:e2e` script
- [x] 3.2 Configure `playwright.config.ts` with `video: 'on'`, `trace: 'retain-on-failure'`, and a webServer/base URL pointing at the production build
- [x] 3.3 Write `e2e/portal-shell.spec.ts`: load `/`, navigate to `/players`, `/games`, `/seasons`, assert each renders
- [x] 3.4 Verify `npm run test:e2e` passes locally against `docker compose up -d --wait` + `next build && next start`, and produces a video and HTML report (trace is `retain-on-failure` — none expected on a passing run)

## 4. GitHub Actions workflow

- [x] 4.1 Create `.github/workflows/ci.yml` triggered on `push` and `pull_request`
- [x] 4.2 Add the `lint-and-typecheck` job (`npm run lint`, `npm run typecheck`)
- [x] 4.3 Add the `unit` job, `needs: lint-and-typecheck`
- [x] 4.4 Add the `integration` job, `needs: unit`: services started via `scripts/wait-for-docker-services.sh` (wraps `docker compose up -d --wait`, which exits 1 even on success because of the one-shot init containers — see 2.3 — and asserts real container health/exit-code instead), run `npm run test:integration`, tear down with `docker compose down -v`
- [x] 4.5 Add the `e2e` job, `needs: integration`: services started the same way, `npx playwright install --with-deps chromium`, `npm run test:e2e` (Playwright's own `webServer` config runs `npm run build && npm run start`), tear down services
- [x] 4.6 Upload Playwright's video/trace/HTML report output as a workflow artifact in the `e2e` job, using `if: always()` so artifacts publish on failure too

## 5. Verification

- [ ] 5.1 Open a pull request containing this change and confirm all five stages (lint, typecheck, unit, integration, e2e) pass in a single workflow run
- [ ] 5.2 Confirm the workflow run's artifacts include a downloadable video, trace, and HTML report
- [ ] 5.3 Flag to Bradley that branch protection / required status checks still needs to be enabled manually in GitHub repo settings to actually block merges — not part of this change's file changes
