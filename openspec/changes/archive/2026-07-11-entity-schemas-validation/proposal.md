## Why

The portal has no shared definition of its data model yet. `docs/03-data-model.md` describes the target shapes and validation rules, but nothing in the codebase enforces them — `seed/types.ts` is an explicit, admittedly-temporary stand-in ("KAN-13 owns the real schema layer"). Every later phase (players, games, stats, publishing) depends on one canonical, client-and-server-shared definition of these entities existing first (KAN-13, blocking KAN-14 and the Phase 2+ feature work).

## What Changes

- Add `zod` (v4) as a dependency.
- Add Zod schemas for all five entities: `Season`, `Player`, `Team`, `Game` (including nested `Goal`, `Penalty`, `OpponentGoal`, `OpponentPenalty`), and `Publishes`.
- Add Zod enums: `Position`, `GameType` (flat 4-value, `NIHC` included — no create/stored split), `GoalType`, `PenaltyCode` (all 29 codes from `docs/03-data-model.md`, including the unconfirmed `HOST` label as documented).
- Enforce single-document validation rules from `docs/03-data-model.md` via Zod refinements: `positions` non-empty, `number` 1–99, assist distinctness (`assist1` ≠ scorer, `assist2` ≠ scorer ≠ `assist1`), `second` 0–59, goal/penalty/netminder/award roster-membership (`superRefine` on `Game`, since roster is a sibling field), penalty `duration` > 0, season `_id`/`name` format and cross-consistency.
- Field-level error messages are attached directly on the schemas so client and server report identically by construction (same schema, same `safeParse`).
- **Out of scope** (left for KAN-14 / the service layer, since they require a DB round-trip, not just the document being validated): `number` uniqueness among active players, blocked roster removal when a player is still referenced by a goal/penalty/award.
- **Out of scope** (deferred to game-creation UI work, KAN-18): restricting `NIHC` to historical-only games. The schema accepts all 4 `GameType` values everywhere; "selectable on create" is a form-level concern, not a typing concern.
- Not changed: `seed/types.ts` is left as-is, not migrated onto the new schemas.

## Capabilities

### New Capabilities
- `entity-schemas`: Zod schemas, enums, and single-document validation rules for Season, Player, Team, Game, and Publishes, shared between client and server.

### Modified Capabilities
(none — no existing spec covers the data model)

## Impact

- **New dependency**: `zod` (v4).
- **New code**: a schema module (e.g. `lib/schemas/`) with no dependents yet — nothing currently imports it. Non-breaking addition.
- **Not touched**: `seed/`, `lib/mongodb.ts`, `lib/s3.ts`, any `app/` routes/pages.
- **Downstream unblocked**: KAN-14 (data-access layer) and all Phase 2+ feature tickets (KAN-15 onward) can build on these schemas.
