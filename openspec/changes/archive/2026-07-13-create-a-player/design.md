## Context

`/players` is currently the KAN-8 placeholder page. The repository layer this change needs already exists on `main` (merged from KAN-14): `lib/repositories/players.ts` exposes `createPlayer(input: PlayerCreateInput): Promise<Player>` and `listPlayers(): Promise<Player[]>`, handles id generation and audit timestamps, and throws a typed `DuplicateShirtNumberError` when a write violates the database's partial unique index on `{ number: 1 }` where `{ active: true }`. `lib/schemas/player.ts` exposes `PlayerCreateInputSchema` (Zod), already enforcing shirt-number range and non-empty positions. There is no UI component library, form library, or `components/` directory in this repo — this is the first feature to build real interactive UI.

## Goals / Non-Goals

**Goals:**
- A working create-player form at `/players`, validated identically on client and server via `PlayerCreateInputSchema`.
- A duplicate-active-shirt-number write surfaces as a clear, field-level error, not a crash or generic error page.
- A minimal list on the same page shows every player's name and shirt number, so a created player is visibly confirmed without a manual refresh.
- Correct the `imageUrl` → `imagePath` schema shape before any real data is written through this form.

**Non-Goals:**
- Styling, sorting, filtering, active/inactive grouping, or any field beyond name+number in the list — that is KAN-41.
- Editing or deactivating players (KAN-16), player profile/stats (KAN-17).
- An S3 upload widget — the image field is a plain text identifier input.
- Client-side pre-check of shirt-number uniqueness — the write-time check via `DuplicateShirtNumberError` is the sole enforcement point, by design (see `entity-schemas` spec).

## Decisions

**Server Action + `useActionState`, no form library.** The repo has zero UI dependencies beyond React/Next/Tailwind. A `<form action={createPlayerAction}>` using React 19's `useActionState` is the native fit for Next 16 App Router and needs no new dependency. Rejected: react-hook-form / a client-fetch + API route pattern — both add a dependency or a redundant HTTP boundary for no benefit at this scale.

**Single shared schema, parsed twice.** The server action parses the raw `FormData` against `PlayerCreateInputSchema` (the authoritative check — never trust the client) and returns `error.flatten().fieldErrors`-shaped output on failure. The client does not re-implement validation; it only reflects the returned field errors. This satisfies the entity-schemas spec's "identical validation on client and server" requirement by construction (same schema, same call), rather than by keeping two implementations in sync.

**Positions and active as native form controls.** Positions: three checkboxes (`Forward`/`Defence`/`Goaltender`), submitted as repeated `positions` form fields, read via `formData.getAll("positions")`. Active: a single checkbox, defaulting checked (new players are active by default — matches the ticket's framing of "add a new player ... so they can be selected for games").

**Duplicate shirt number surfaces via a caught exception, not a pre-check.** The action calls `createPlayer()` inside a try/catch; on `DuplicateShirtNumberError` it returns the same field-error shape as a Zod failure, keyed to `number`, so the form doesn't need two different rendering paths for "invalid" vs. "conflicts with another player." Rejected: a pre-submit "check if number is taken" query — it would be racy anyway (TOCTOU) and the entity-schemas spec already places uniqueness enforcement at the database/repository layer, not in validation.

**List: a server component, no client-side cache.** `/players` is a Server Component that calls `listPlayers()` directly (no client fetch, no state library). After a successful create, the action calls `revalidatePath("/players")`; App Router re-renders the server component with fresh data. This is the smallest correct way to satisfy "appears in the player list immediately" given Next 16's server-first model. The list itself renders only `firstName + " " + surname` and `number` — deliberately not the richer shape KAN-41 will add (positions, active/inactive, nickname, images, sorting), to keep this change's surface area to what KAN-15 needs.

**`imageUrl` → `imagePath`.** Store the bare S3 object key/filename an admin has already uploaded (e.g. `plr100010.jpg`), not a full URL, so stored documents remain environment-portable per the `local-docker-environment` spec's guarantee ("no code changes required to point at a different target"). The form's image field is optional free text; no validation beyond non-empty-if-present (`z.string().min(1).optional()`). Building the full display URL from `S3_BUCKET`/`S3_ENDPOINT` for rendering is left for whichever future ticket actually displays player images (not this one, and not KAN-41 per its own minimal scope) — this change only needs the field to be storable and correctly shaped.

## Risks / Trade-offs

- **[Risk]** `imagePath` is a breaking schema change to already-merged (KAN-13/14) work. → **Mitigation**: no production data exists yet (pre-launch project); update the seed fixture and docs in the same change so nothing is left inconsistent.
- **[Risk]** The minimal list (name + number only) may look unfinished next to a real create form. → **Mitigation**: explicitly scoped and documented as deferred to KAN-41 in both the proposal and this design, so it isn't mistaken for the finished roster view.
- **[Trade-off]** `revalidatePath` re-fetches the whole list on every create rather than optimistic UI update. → Acceptable: admin tool, low write frequency, correctness over snappiness.

## Open Questions

- None outstanding — all prior open threads (KAN-14 sequencing, list-view ownership, image field shape, duplicate-number UX, form architecture) were resolved during exploration before this design was written.
