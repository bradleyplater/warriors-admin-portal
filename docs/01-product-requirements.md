# 01 — Product Requirements

## Problem statement

Managing the Warriors website data currently requires two separate services that export JSON files committed into the website repo. The process is clunky and error prone: aggregate stats are hand-maintained in multiple places and have already drifted (three of four seasons show discrepancies between stored totals and the underlying game records).

## Goal

One foolproof admin portal. The user manages players and games; all stats are computed automatically; pressing **Publish** updates the live website with no manual export, no website deploy, and no possibility of stats disagreeing with the games they came from.

## Users

A single administrator (the team's stat keeper). No auth in MVP — see Non-goals.

## Success criteria

- Both existing admin services can be switched off.
- Entering a game never requires manually updating any stat anywhere.
- Published website data always reconciles exactly with the game records.
- The user can watch the whole flow work in recorded Playwright runs.

---

## MVP features

### 1. Player management

Create and edit players with:

| Field | Rules |
|---|---|
| First name | Required |
| Surname | Required |
| Number | Required, integer **1–99**, unique among active players |
| Active | Required boolean; backfilled by manual review during migration |
| Positions | One or more of **Forward, Defence, Goaltender** |
| Nickname | Optional, single free-text value |
| Image URL | Optional link to the player's image in the S3 bucket |

Season stats (games played, goals, assists, penalty minutes, player-of-the-game and warrior-of-the-game counts) are **displayed** in the player area but are **read-only** — they are computed from game records and cannot be edited here.

### 2. Game management

Create a game with:

| Field | Rules |
|---|---|
| Date | Required |
| Season | Required, selected from Seasons (e.g. 25/26) |
| Opponent | Required, free-text team name |
| Game type | One of **CHALLENGE, BOTBC, LLIHC** (legacy games may carry the read-only type NIHC) |
| Location | **HOME** or **AWAY** |
| Roster | The players who played, selected from active players |

After creation the game can be edited freely:

- **Roster** — add/remove players. Games-played totals update automatically because they are computed from rosters.
- **Awards** — select Player of the Game (stored as `manOfTheMatch`) and Warrior of the Game from the roster.
- **Netminder** — select from the roster.
- **Team goals** — scorer (from roster), up to 2 assists (from roster, distinct from scorer and each other), minute + second, and type: Even Strength (EVEN), Power Play (PP), Short Handed (SH), Penalty Shot (PS), Empty Net (EN), Shootout (SO). Editable and deletable; all stats recompute.
- **Opponent goals** — same shape but the scorer is a free-text name; no stats update.
- **Team penalties** — offender (from roster, or **BENCH** for bench penalties such as too-many-men), minute + second, penalty type (see code list in [03 — Data Model](03-data-model.md)), duration in minutes (this is the PIM contribution). Bench-penalty PIMs count to the team, not a player.
- **Opponent penalties** — same shape with a free-text offender name.

**Score is fully derived.** Totals come from the entered goals; the period-by-period line is derived from goal times using 20-minute running-clock periods. Shootout goals do not count in a period — a shootout win adds +1 to the winner's total. Nothing about the score is typed in manually.

### 3. Publishing

- MongoDB is the source of truth; the website reads JSON from S3/CDN.
- A **Publish** button regenerates all website JSON and uploads it to S3 (with CDN invalidation if applicable).
- The portal shows an **unpublished changes** indicator whenever data has changed since the last publish.
- The published JSON must match the shapes the website currently reads (captured as golden fixtures in Phase 0 of the [roadmap](07-build-roadmap.md)).

### 4. Seasons

Seasons span two years (22/23, 23/24, …). Existing IDs follow `SSN2526` with display name `25/26`. MVP needs the ability to create a new season; everything else about seasons is a picker.

---

## Non-goals (MVP)

- **Authentication** — deliberately excluded; the architecture leaves a middleware seam so it can be added without restructuring ([02 — Architecture](02-architecture.md)).
- **Multi-team support** — the data model keeps a single Team document (Peterborough Warriors); no UI for managing multiple teams.
- **Rebuilding the public website** — it changes only its JSON base URL (repo files → S3/CDN).
- **Opponent player tracking** — opponents remain free-text names, as today.
- **Image uploading** — MVP stores a URL to an existing S3 object; an upload flow is a future enhancement.

## Decisions log (agreed 2026-07-04)

| # | Decision |
|---|---|
| D1 | Auto JSON publishing to S3/CDN; website updated once to read from there |
| D2 | Explicit Publish button with unpublished-changes indicator |
| D3 | Host-agnostic build; hosting decision deferred |
| D4 | No auth in MVP |
| D5 | Playwright for E2E |
| D6 | `Game` is the single source of truth; aggregates computed; migration reconciliation signed off before cutover |
| D7 | Positions become a multi-select enum array; existing 8 spellings cleaned up |
| D8 | `active` backfilled via manual review checklist during migration |
| D9 | Strict 1–99 numbers; the 14 out-of-range players renumbered before cutover; number stored on the player |
| D10 | Single nickname per player |
| D11 | Game types CHALLENGE/BOTBC/LLIHC selectable; NIHC read-only historical; casing normalised |
| D12 | Score and period breakdown fully derived from goals |
| D13 | Keep `manOfTheMatch`/`warriorOfTheGame` field names; UI labels them "Player of the Game" / "Warrior of the Game" |

## Open questions

| Question | Needed by |
|---|---|
| Exact current JSON shapes the website reads | Phase 0 — captured from the website repo as golden fixtures |
| S3 bucket / CDN details (bucket name, region, invalidation) | Phase 5 (publish pipeline) |
| Production hosting target | Phase 6 (cutover) — app is host-agnostic until then |
| Friendly labels for a few penalty codes (see [03](03-data-model.md)) | Phase 3 (game UI) — best-guess labels proposed, need confirmation |
