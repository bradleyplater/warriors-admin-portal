# Tasks: scaffold-portal-app

## 1. Generate and merge the scaffold

- [ ] 1.1 Run `create-next-app` (latest, TypeScript, App Router, Tailwind, ESLint, no `src/`, npm) in a temp directory
- [ ] 1.2 Merge generated files into the repo root, preserving `docs/`, `openspec/`, `.claude/`, and the existing `README.md`
- [ ] 1.3 Union-merge the generated `.gitignore` with the existing one; verify `node_modules/`, `.next/`, and `.env*` are ignored
- [ ] 1.4 Pin Node: add `engines` to `package.json` and create `.nvmrc` (current active LTS)
- [ ] 1.5 Verify `npm install` and `npm run dev` serve the default app locally

## 2. Code quality tooling

- [ ] 2.1 Add Prettier with `eslint-config-prettier` last in the ESLint config chain
- [ ] 2.2 Add scripts: `format` (write), `format:check` (verify), `typecheck` (`tsc --noEmit`)
- [ ] 2.3 Run `format` once over the scaffold so `format:check` passes on a clean checkout
- [ ] 2.4 Verify `npm run lint`, `npm run format:check`, and `npm run typecheck` all pass

## 3. Portal shell

- [ ] 3.1 Build the shared shell in `app/layout.tsx`: nav links to Players / Games / Seasons, commented slot reserved for the future publish-status area
- [ ] 3.2 Replace the default home page with a minimal Warriors Admin Portal landing page
- [ ] 3.3 Add placeholder pages at `app/players/page.tsx`, `app/games/page.tsx`, `app/seasons/page.tsx` — each names its area, no fake data or dead controls
- [ ] 3.4 Add `middleware.ts` with a pass-through matcher covering all portal routes
- [ ] 3.5 Verify all four pages render with no MongoDB/S3 running and navigation works between them

## 4. Documentation and final verification

- [ ] 4.1 Add a "Getting started" section to `README.md` (Node version, `npm install`, `npm run dev`, available scripts), preserving existing content
- [ ] 4.2 Verify `npm run build` completes without errors with no services running
- [ ] 4.3 Full acceptance pass mirroring KAN-8 criteria: fresh-clone steps work, lint + typecheck + format:check pass, production build succeeds, shell shows placeholder nav for Players/Games/Seasons
