# Design: scaffold-portal-app

## Context

The repo contains only planning docs (`docs/`), OpenSpec scaffolding (`openspec/`), and tooling config (`.claude/`) — no application code. [02 — Architecture](../../../docs/02-architecture.md) fixes the stack: Next.js 15+ App Router, TypeScript, Tailwind-based component library later, official MongoDB driver later. Sibling tickets own Docker (KAN-9), seed (KAN-10), CI (KAN-11), Playwright (KAN-12), and the data layer (KAN-13/14), so this change must produce a base they can all build on without touching any of their concerns.

Decisions below marked *(confirmed)* were signed off by Bradley during exploration on 2026-07-04.

## Goals / Non-Goals

**Goals:**

- A runnable Next.js + TypeScript app at the repo root with a portal shell (nav to Players / Games / Seasons placeholders).
- Lint, format, type-check, and production-build commands that pass on a clean checkout.
- README "Getting started" that takes a fresh clone to a running dev server.
- The day-one auth seam: pass-through `middleware.ts`.
- Zero dependence on any running service — no database, no S3.

**Non-Goals:**

- No Docker/compose, seed data, CI config, or Playwright setup.
- No Zod schemas, repositories, or MongoDB connection code.
- No shadcn/ui initialisation (deferred to the first real screen, KAN-15).
- No authentication, no `requireUser()` stub (arrives with the first server action).
- No visual design work beyond a clean, minimal shell.

## Decisions

1. **Scaffold with `create-next-app` in a temp directory, then merge into the repo root.** `create-next-app` refuses to run in a directory containing a conflicting `README.md` (and would fight over `.gitignore`). Generating in a scratch directory and copying files in preserves `docs/`, `openspec/`, `.claude/`, and the existing README while still getting upstream's current defaults. Alternative considered: hand-rolling the config files — more error-prone and silently drifts from framework defaults.
2. **Tailwind CSS at scaffold time** *(confirmed)*. It's a `create-next-app` flag now and a retrofit later; shadcn/ui (which requires Tailwind) is planned for the Players epic.
3. **ESLint + Prettier** *(confirmed)*, wired together with `eslint-config-prettier` so formatting rules never conflict with lint rules. ESLint uses whatever config format `create-next-app` currently emits (flat config as of Next 15). Alternative considered: Biome (single fast tool) — rejected in favour of the boring, ecosystem-standard pair.
4. **Root-level `app/` directory, no `src/`** *(confirmed)*. Matches the path conventions used throughout the planning docs (`app/players`, `app/games`, `app/seasons`).
5. **npm as package manager** *(confirmed)*. All planning docs write `npm install` / `npm run …`; no reason to diverge.
6. **Scripts**: `dev`, `build`, `start` (Next defaults) plus `lint` (ESLint), `format` / `format:check` (Prettier write/check), and `typecheck` (`tsc --noEmit`). Type-checking is a standalone script rather than build-only so CI (KAN-11) can run it as a distinct stage.
7. **TypeScript strict mode on** (create-next-app default). Loosening later is easy; tightening later is a slog.
8. **`middleware.ts` with a pass-through matcher covering all portal routes.** Required "from day one" by the architecture doc's auth seam. It does nothing but forward requests; implementing auth later means filling in this one file plus a login page.
9. **Node version pinned** via `engines` in `package.json` and an `.nvmrc`, so "fresh clone follows README" is deterministic. Pin to the current active LTS at implementation time.
10. **Shell layout reserves a publish-status slot.** The architecture doc puts a publish status area in the shell (KAN-32). The layout leaves an obvious, commented placement rather than building anything.

## Risks / Trade-offs

- [`create-next-app` output changes over time — flags or generated files may differ from this design] → Treat the generated output as authoritative for config file names/formats; this design fixes the *choices* (Tailwind yes, ESLint yes, no src/, App Router, TS), not exact file contents.
- [Merging generated `.gitignore` with the existing one could drop entries] → Union-merge the two files manually; verify `node_modules/`, `.next/`, and `.env*` are ignored.
- [ESLint/Prettier rule conflicts cause noisy false lint failures] → `eslint-config-prettier` last in the config chain; `format:check` and `lint` verified independently on the clean scaffold.
- [Developing on Windows: npm scripts with shell-isms break] → Keep scripts to plain binaries (`next`, `eslint`, `prettier`, `tsc`); no `&&`-chains with POSIX-only commands.
- [Placeholder pages get mistaken for real feature work] → Each placeholder states its area name and that content arrives with its epic; no fake data or dead controls.

## Migration Plan

Greenfield — no deployment or rollback concerns. The change lands as one commit on a branch; rollback is reverting the commit. Existing planning docs are untouched apart from README additions.

## Open Questions

- None blocking. Visual identity of the shell (colours, logo) is deliberately unaddressed — minimal Tailwind styling until a design direction exists.
