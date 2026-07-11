## Why

KAN-11 requires an automated pipeline that blocks merges on lint, type-check, unit, integration, and e2e failures, with a demonstrated green run against the seeded environment. Today only lint/typecheck/build exist as local commands (`dev-tooling`) and nothing runs automatically — every regression (a broken health check, a bad guard-rail edge case, a scaffold that no longer renders) relies on someone remembering to run commands by hand before merging. There is no test runner of any kind in the repo yet.

## What Changes

- Add Vitest as the unit + integration test runner, with a real (non-placeholder) first test in each tier:
  - Unit: `seed/guard.ts`'s `assertLocalOrAllowed()` — its `--allow-remote` / invalid-URI / disallowed-host / allowed-host branches.
  - Integration: `app/api/health/route.ts`'s `GET` handler, run against the real dockerized MongoDB + MinIO from `docker-compose.yml`.
- Add Playwright as the e2e runner, with a real first smoke test against the current portal shell (renders, navigates between the Players/Games/Seasons placeholder pages), configured with `video: 'on'` and `trace: 'retain-on-failure'`.
- Add a GitHub Actions workflow that runs on every push and pull request, in order: lint + typecheck → unit → integration → e2e. Any stage failing fails the workflow. Integration and e2e stages bring up services via `docker compose up -d --wait` against the existing `docker-compose.yml` (no duplicate service definitions in the workflow).
- Upload Playwright's videos, traces, and HTML report as downloadable workflow artifacts on every run (not just failures).
- **Not included**: enabling GitHub branch protection / required status checks (the actual merge-blocking enforcement) is a repository-settings change outside this repo's files — flagged as a manual follow-up for Bradley once the workflow has run green.
- **Not included**: KAN-12's broader Playwright journey coverage (player lifecycle, game entry, roster edit, etc. from `docs/05-testing-strategy.md`) — this change only adds the tooling and one honest smoke test; expanding e2e coverage is deferred.

## Capabilities

### New Capabilities
- `automated-testing`: Unit (Vitest), integration (Vitest + dockerized MongoDB/MinIO), and e2e (Playwright) test tooling and their first real tests.
- `ci-pipeline`: GitHub Actions workflow that runs lint/typecheck/unit/integration/e2e on every push and PR, blocking on failure, reusing `docker-compose.yml` for services, and publishing e2e artifacts.

### Modified Capabilities
- None. `dev-tooling` (lint/format/typecheck/build) is unchanged — test commands live in the new `automated-testing` capability instead of being folded into it.

## Impact

- `package.json`: new `devDependencies` (Vitest, Playwright, supporting types) and new scripts (`test:unit`, `test:integration`, `test:e2e` or similar).
- New config files: Vitest config(s) for unit vs. integration (integration needs the dockerized services up first), Playwright config.
- New test files under a `tests/` (or colocated) structure: one unit test, one integration test, one e2e test.
- New `.github/workflows/ci.yml`.
- No changes to application code, `docker-compose.yml`, or existing seed/health logic — tests observe existing behavior, they don't change it.
