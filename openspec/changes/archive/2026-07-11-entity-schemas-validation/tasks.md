## 1. Setup

- [x] 1.1 Add `zod` (v4) to `package.json` dependencies
- [x] 1.2 Create `lib/schemas/` module directory

## 2. Enums

- [x] 2.1 Define `Position` enum in `lib/schemas/enums.ts`
- [x] 2.2 Define `GameType` enum (flat 4-value: `CHALLENGE`, `BOTBC`, `LLIHC`, `NIHC`)
- [x] 2.3 Define `GoalType` enum (`EVEN`, `PP`, `SH`, `PS`, `EN`, `SO`)
- [x] 2.4 Define `PenaltyCode` enum with all 29 codes from `docs/03-data-model.md`, including `HOST`
- [x] 2.5 Add `PENALTY_CODE_LABELS` display-label map (Jira KAN-13 acceptance criteria requires display labels; missed in generated spec)

## 3. Season schema

- [x] 3.1 Define base `Season` schema (`_id`, `name`, `createdAt`, `updatedAt`)
- [x] 3.2 Add `_id` format validation (`SSN` + 4 digits)
- [x] 3.3 Add `name` format validation (`##/##`)
- [x] 3.4 Add cross-field refinement: `_id` year digits consistent with `name`
- [x] 3.5 Derive `SeasonCreateInput` (omit `_id`, `createdAt`, `updatedAt`)

## 4. Player schema

- [x] 4.1 Define base `Player` schema (identity fields, `number`, `positions`, `active`, optional `nickname`/`imageUrl`, `teamId`, audit timestamps)
- [x] 4.2 Add `number` range validation (1–99)
- [x] 4.3 Add `positions` non-empty validation
- [x] 4.4 Add a code comment noting `number` active-uniqueness is enforced by the DB unique partial index / KAN-14, not this schema
- [x] 4.5 Derive `PlayerCreateInput` (omit `_id`, `createdAt`, `updatedAt`)

## 5. Team schema

- [x] 5.1 Define `Team` schema (`_id`, `name`, `createdAt`, `updatedAt` only — no `players[]`/`stats[]`)
- [x] 5.2 Derive `TeamCreateInput` (omit `_id`, `createdAt`, `updatedAt`)

## 6. Game schema and nested shapes

- [x] 6.1 Define `Goal` schema (`_id`, `scoredBy`, optional `assist1`/`assist2`, `minute`, `second`, `type`)
- [x] 6.2 Define `Penalty` schema (`_id`, `offender`, `minute`, `second`, `type`, `duration`)
- [x] 6.3 Define `OpponentGoal` schema (free-text `scoredBy`)
- [x] 6.4 Define `OpponentPenalty` schema (free-text `offender`)
- [x] 6.5 Define base `Game` schema composing `team` (`id`, `roster`, `goals`, `penalties`) and `opponentTeam` (`name`, `goals`, `penalties`), plus `date`, `seasonId`, `type`, `location`, optional `netminderPlayerId`/`manOfTheMatchPlayerId`/`warriorOfTheGamePlayerId`, audit timestamps
- [x] 6.6 Add `second` bounds validation (0–59) on `Goal` and `Penalty`
- [x] 6.6b Add `minute` within-game-length validation on `Goal` (0–59, exempt for `SO`) — data model doc's Goals validation bullet; missed in generated spec
- [x] 6.7 Add assist distinctness refinement: `assist1` ≠ `scoredBy`; `assist2` ≠ `scoredBy` and ≠ `assist1`; `assist2` requires `assist1`
- [x] 6.8 Add `duration` > 0 validation on `Penalty`
- [x] 6.8b Add no-duplicate-roster-entries check — data model doc's "Game roster: ... no duplicates" bullet; missed in generated spec
- [x] 6.9 Add `superRefine` on `Game` for roster-membership: goal `scoredBy`/`assist1`/`assist2` in `team.roster`
- [x] 6.10 Extend the `superRefine` for penalty `offender` in `team.roster` OR literal `"BENCH"`
- [x] 6.11 Extend the `superRefine` for `netminderPlayerId`, `manOfTheMatchPlayerId`, `warriorOfTheGamePlayerId` in `team.roster`
- [x] 6.12 Add a code comment noting blocked-removal-when-referenced is enforced elsewhere (KAN-14/service layer), not this schema
- [x] 6.13 Derive `GameCreateInput` (omit `_id`, `createdAt`, `updatedAt`, and nested `_id`s on goals/penalties where generated)

## 7. Publishes schema

- [x] 7.1 Define `Publishes` schema (`_id`, `startedAt`, `completedAt`, `artifacts[]`, `status`, optional `error`)
- [x] 7.2 Derive `PublishesCreateInput` (omit `_id`)

## 8. Module exports

- [x] 8.1 Re-export all schemas and enums from `lib/schemas/index.ts`

## 9. Tests

- [x] 9.1 Unit test each enum: valid values accepted, invalid values rejected with field-level errors
- [x] 9.2 Unit test `Season`: valid case, malformed `_id`, malformed `name`, `_id`/`name` mismatch
- [x] 9.3 Unit test `Player`: valid case, `number` boundaries (0, 1, 99, 100), empty `positions`
- [x] 9.4 Unit test `Team`: valid case; confirm no `players`/`stats` fields exist on the schema
- [x] 9.5 Unit test `Game`: valid case, scorer/assist/penalty/netminder/award roster-membership violations (one test per field), assist distinctness cases, `second` boundaries, non-positive `duration`, `BENCH` offender accepted, opponent free-text accepted
- [x] 9.6 Unit test `Publishes`: valid success and failed cases
- [x] 9.7 Unit test each `*CreateInput` variant: generated fields omitted successfully; base schema still requires them
- [x] 9.8 Confirm (via a shared-import test or lint rule) that no file under `lib/schemas/` imports the MongoDB driver or `lib/mongodb.ts`

## 10. Verification

- [x] 10.1 `npm run typecheck` passes
- [x] 10.2 `npm run lint` passes
- [x] 10.3 `npm run test:unit` passes
