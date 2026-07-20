## Context

KAN-18's own tasks.md checklist marked items complete because the code existed, not because a test proved the behavior. Five gaps were named in the KAN-44 Jira ticket; a full retrospective audit (every `export function`/`export const`/`export async function` in `lib/`, `app/`, `seed/` cross-checked against existing test files) found four more of the same shape, plus a sixth pre-existing bug (`/players` missing `force-dynamic`) that has been split into KAN-45 since it's a behavior fix, not a test gap. No coverage tooling (thresholds, nyc/istanbul, codecov) exists in this project today — `openspec/specs/ci-pipeline/spec.md` runs lint → typecheck → unit → integration → e2e with no coverage stage.

## Goals / Non-Goals

**Goals:**
- Close all ten identified test gaps with real, passing tests.
- Make "done" mean "a test would fail without this behavior" a checked, spec-level rule, not tribal knowledge.
- Prove the rule works by having this change's own ten tests satisfy it — including failing red against current code before any test-only fix makes them pass.

**Non-Goals:**
- No production code changes. If a test reveals the underlying behavior is actually broken (beyond the already-split `/players` bug), that becomes its own bug ticket, not scope creep here.
- No coverage-percentage tooling or CI gate. See Decision below.
- No retrofit of tests for code already covered indirectly through integration tests (`lib/repositories/*`) or already directly tested (`lib/schemas/*`, `score.ts`, `seed/guard.ts`, `internal/ids.ts`, `internal/audit.ts`).

## Decisions

**Documented spec requirement, not an enforced coverage-percentage CI gate.** The ticket's own framing is behavioral ("a test that would fail without it"), not line-coverage. A percentage threshold can be satisfied by tests that execute a branch without asserting anything meaningful about it — it rewards the wrong thing. A spec requirement in `automated-testing` gives future changes (and their reviewers) a specific, checkable rule — three concrete triggers (branching pure function, notFound()/error branch, live-data page without a dynamic segment) — without needing new CI infrastructure. Enforcement is by review against the spec, the same mechanism every other requirement in this project already relies on. Revisit if the project grows past the point where review-based enforcement scales.

**Formalize the 404 and freshness behaviors as capability requirements, not just test additions.** These behaviors exist in shipped code today but were never specified in `game-management`, `player-profile`, or `player-management`. Writing them down means future changes to those pages are held to the same behavior the tests now check, rather than the tests being the only record that it matters.

**Tests must demonstrate red-then-green.** Per the Jira acceptance criteria, the rule only counts as proven if these ten tests would actually have caught the gap — meaning each test must fail against the current code path before being satisfied (trivially, since the behavior already exists and works; the "red" state is the test's absence, not a code defect). Concretely: write and run each test, confirm it passes against current behavior, and — where feasible — briefly verify it fails if the underlying code is reverted (e.g. temporarily removing `force-dynamic` or the `notFound()` call and confirming the new test catches it), then restore the code. This is a verification step during implementation, not a persisted change.

**Split, don't absorb, newly discovered bugs.** The `/players` freeze bug (KAN-45) was found using the same audit method this change uses. Any further bug discovered while writing these tests follows the same path: raised as its own ticket, referenced here, not fixed inline.

## Risks / Trade-offs

- **[Risk]** A documented-but-unenforced rule can be skipped under time pressure, same as any review-based check. → **Mitigation**: the rule lives in `openspec/specs/automated-testing/spec.md` where `openspec validate` and future change proposals already surface capability requirements; it's one file, checked the same way as every other requirement.
- **[Risk]** The freshness test for `/games`/`/games/new` requires a production build + server start + post-start data creation — heavier than the rest of the e2e suite. → **Mitigation**: this shape already exists implicitly in `npm run test:e2e`'s documented setup (`automated-testing` requires running against `next build` + `next start`); the new test just adds a "create after start" step to an already-running suite, no new infrastructure.
- **[Risk]** Broadening "retrospective" to all exported functions could in principle surface unbounded scope. → **Mitigation**: the audit already ran to completion (see Context) and produced a fixed, closed list of ten; this design does not leave the audit open-ended for future changes to re-trigger against old code, only against new code going forward (per the new `automated-testing` requirements).

## Migration Plan

Not applicable — test-only change plus spec documentation, no data migration, no deployment sequencing beyond normal CI.

## Open Questions

None outstanding. Scope (all ten gaps, spec-as-rule, KAN-45 split out) was confirmed before this proposal was written.
