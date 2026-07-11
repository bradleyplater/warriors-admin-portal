## Context

The scaffold (KAN-8), Docker environment (KAN-9), and seed data (KAN-10) are done, but nothing runs automatically and there is no test runner installed. `dev-tooling` already provides `lint`, `format:check`, `typecheck`, and `build` as local npm scripts — this change adds the three missing tiers (unit, integration, e2e) and wires all five stages into a GitHub Actions workflow per KAN-11's acceptance criteria. `docker-compose.yml` already defines a healthy-gated, self-seeding local stack (mongo → mongo-seed, minio → minio-init); the design goal is to reuse that stack in CI rather than re-describe it.

## Goals / Non-Goals

**Goals:**
- Real (non-placeholder) first test in each new tier, exercising logic that already exists in the repo.
- A GitHub Actions workflow triggered on every push/PR that runs lint+typecheck, unit, integration, and e2e, failing the run if any stage fails.
- Integration and e2e stages run against the same `docker-compose.yml` used locally — one definition of the environment.
- E2e artifacts (video, trace, HTML report) uploaded from every run.

**Non-Goals:**
- Broader Playwright journey coverage (player lifecycle, game entry, etc.) — that's KAN-12's content once there's a real UI to drive.
- Enabling GitHub branch protection / required status checks — a repo-settings change outside this repo's files, left as a manual follow-up.
- Optimizing CI runtime (caching, parallelism beyond what's described below) — acceptable to revisit once the pipeline exists and its actual runtime is known.

## Decisions

**Vitest for both unit and integration, as two separate configs/scripts.** Matches `docs/05-testing-strategy.md`'s tiering (Tier 1/2 both Vitest). Kept as two separate npm scripts (`test:unit`, `test:integration`) with separate Vitest config so `test:unit` never needs Docker running and stays fast — integration tests are the ones gated on `docker compose up -d --wait`.

**Playwright for e2e**, per the testing strategy doc, with `video: 'on'` and `trace: 'retain-on-failure'` set in `playwright.config.ts` so the acceptance criteria's artifact requirement is satisfied by config, not a CI-side workaround.

**Test placement**: unit tests colocated next to source (`seed/guard.test.ts`) — standard Vitest convention, keeps the test next to the code it exercises. Integration tests centralized under `tests/integration/` since they exercise a cross-cutting surface (an API route hitting two real services) rather than a single module. E2e tests under `e2e/` (kept separate from `tests/integration` so Playwright's own config/glob doesn't need to filter out Vitest files or vice versa).

**First test per tier** — chosen for being real, not synthetic:
- Unit: `seed/guard.ts` → `assertLocalOrAllowed()`. Existing branches (`--allow-remote`, invalid URI, disallowed host, allowed host) are tested as-is; no source changes.
- Integration: `GET /api/health`. Started against the real `docker-compose.yml` stack; asserts `200` with `{ mongo: "ok", s3: "ok" }` when services are healthy. This is the acceptance criterion's "green run on scaffold + seeded environment" made concrete.
- E2e: load `/`, navigate to `/players`, `/games`, `/seasons` and assert each placeholder page renders. Sized to match the current shell — not inflated.

**CI reuses `docker-compose.yml` directly** (`docker compose up -d --wait`) rather than GitHub Actions' native `services:` blocks. Rationale (agreed during exploration): native services would duplicate the Mongo/MinIO definitions in a second syntax, and the one-shot `mongo-seed`/`minio-init` containers don't fit the "long-running sidecar" services model anyway — imperative seed steps would still be needed by hand. Reusing the compose file gives one source of truth that dev and CI both exercise identically.

**Workflow shape: sequential jobs via `needs:`**, in the order the acceptance criteria and `docs/05-testing-strategy.md` both state: `lint-and-typecheck → unit → integration → e2e`. This is slower than running independent stages in parallel (lint/typecheck and unit don't actually depend on each other), but it matches the documented pipeline shape exactly, fails fast on the cheapest checks first, and is simpler to reason about for a first version. Revisit for parallelism if CI time becomes a problem.

**E2e stage builds and runs a production build** (`next build && next start`) rather than `next dev`, so the stage also incidentally re-validates the production build path against real services, then Playwright runs against `localhost:3000`.

## Risks / Trade-offs

- **Sequential jobs are slower than necessary** → acceptable at current repo size; revisit if pipeline runtime becomes a friction point.
- **Full compose stack (mongo + minio + both init containers) starts even for integration-only** → simplest option since `GET /api/health` checks both services anyway; splitting the stack per stage would add complexity for no current benefit.
- **Playwright browser install adds time to every e2e run** → accepted as a known, standard cost; `npx playwright install --with-deps` runs each time. Caching can be added later without changing the workflow's shape.
- **Green CI does not yet block merges** → branch protection is a manual GitHub settings step for Bradley after the first green run; this change cannot enforce it from within the repo.

## Migration Plan

No data or runtime migration. Deployment is: land the workflow and test tooling, open a PR to confirm a real run goes green end-to-end (satisfying "a green run ... is demonstrated"), then Bradley enables branch protection separately.

## Open Questions

- Should Playwright browser binaries be cached across runs from day one, or is the slower uncached install acceptable until it's actually annoying? Leaning toward accepting it for now — flag as a tasks-time judgment call, not a blocker.
