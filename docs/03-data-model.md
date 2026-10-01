# 03 — Data Model

MongoDB schema for database `HockeyTracker` — the target shape, which production has fully matched since the Step 6 cleanup (2026-09-26, [04 — Migration Plan](04-migration-plan.md)). The "Changes from today" tables below record what the migration changed from the old system's shape. Existing custom string IDs (`PLR######`, `GME######`, `SSN####`, `TM######`) are kept, and newer collections follow suit (`OPN######`, `PUB######`) — they are stable, human-scannable, and already referenced throughout the data. New IDs use the same scheme (prefix + 6 random digits, retry on collision).

All documents gain `createdAt` / `updatedAt` audit timestamps (used by the unpublished-changes indicator).

## Collections

### Seasons — gains `active` (active-season)

```ts
{
  _id: string,        // "SSN2526"
  name: string,       // "25/26"
  active?: boolean,   // the website's current season; absent = not active
  createdAt: Date, updatedAt: Date
}
```

The **active season** is the one flagged `active: true`, or, when none is flagged, the newest by id (`resolveActiveSeason` in `lib/derived/season-order.ts`). If several are ever flagged, the newest flagged one wins. "Set active" on `/seasons` flags the chosen season and unsets the flag on the rest, bumping `updatedAt` on each one it changes. It is published as `seasons.json` and drives the website's default season.

### Player — restructured

```ts
{
  _id: string,               // "PLR502819"
  firstName: string,
  surname: string,
  number?: number,           // 1–99; required when active, unique among active players; inactive players may have none
  positions: Position[],     // ≥1 of "Forward" | "Defence" | "Goaltender"
  active: boolean,
  nickname?: string,         // single value (D10)
  imagePath?: string,        // bare S3 object key/filename for the player's image
  teamId: string,            // "TM551420"
  createdAt: Date, updatedAt: Date
}
```

Changes from the old shape (applied by the migration):

| Old | Target | Why |
|---|---|---|
| `position: string` (8 inconsistent spellings) | `positions: Position[]` | D7 — PRD requires multi-position; current free text has already diverged ("Goalie / Defence", "Defence/Goaltender", …) |
| `teams: [{ teamId, number }]` | `teamId` + top-level `number` | D9 — one team exists; the array indirection only created a second place for numbers to live |
| `stats: [...]` per season | **removed** | D6 — computed from games (see Derived stats) |
| — | `active` | D8 — PRD requirement, backfilled by manual review |
| — | `imagePath` | PRD extra feature |

### Team — slimmed to identity only

```ts
{
  _id: string,   // "TM551420"
  name: string,  // "Peterborough Warriors"
  createdAt: Date, updatedAt: Date
}
```

`players[]` (a full copy of every player's number and season stats) and `stats[]` (team season aggregates) were **removed** — both are derived. These two arrays are where the observed drift lived.

### Game — the source of truth (minor slimming)

```ts
{
  _id: string,              // "GME221248"
  date: Date,
  seasonId: string,         // → Seasons
  type: GameType,           // "CHALLENGE" | "BOTBC" | "LLIHC" | "NIHC" (NIHC read-only historical, D11)
  location: "HOME" | "AWAY",
  team: {
    id: string,             // → Team
    roster: [{ playerId: string }],          // per-game stats removed — derived
    goals: [{
      _id: string,          // "GOL######"
      scoredBy: string,     // playerId, must be in roster
      assist1?: string,     // playerId, in roster, ≠ scorer
      assist2?: string,     // playerId, in roster, ≠ scorer, ≠ assist1; only if assist1 set
      minute: number,       // cumulative game clock
      second: number,       // 0–59
      type: GoalType
    }],
    penalties: [{
      _id: string,          // "PEN######"
      offender: string,     // playerId in roster, or "BENCH"
      minute: number, second: number,
      type: PenaltyCode,
      duration: number      // minutes; the PIM contribution
    }]
  },
  opponentTeam: {
    opponentId: string,     // → Opponent ("OPN######"); the name is resolved at read/publish time
    goals: [{ _id: string /* "OGL######" */, scoredBy: string /* free-text name */, minute, second, type: GoalType }],
    penalties: [{ _id: string /* "OPP######" */, offender: string /* free-text name */, minute, second, type: PenaltyCode, duration: number }]
  },
  netminderPlayerId?: string,          // in roster
  manOfTheMatchPlayerId?: string,      // in roster — UI label "Player of the Game" (D13)
  warriorOfTheGamePlayerId?: string,   // in roster
  createdAt: Date, updatedAt: Date
}
```

Changes from the old shape (applied by the migration):

| Old | Target | Why |
|---|---|---|
| `team.roster[].stats {goals, assists, pims}` | removed | Derivable from the goals/penalties arrays in the same document |
| `team.roster[].teamId` | removed | Redundant with `team.id` |
| `score { team, opponent, periods[] }` | removed | D12 — fully derived (verified derivable from goal times) |
| `type: "challenge"` (mixed casing) | normalised enum | D11 |
| `opponentTeam.name` (free text, with typo variants) | `opponentTeam.opponentId` → Opponent | add-opponents — one canonical, logo-bearing opponent per club; backfilled from an agreed name mapping on 2026-09-27 (32 names → 31 opponents, 91 games; backup `backups/2026-09-27T08-57-49-275Z`) |

### Opponent — new (add-opponents)

```ts
{
  _id: string,             // "OPN######" (OPP is taken by embedded opponent penalties)
  name: string,            // unique, case-insensitively
  logo?: {
    key: string,           // S3 key "opponents/<id>/logo-<epochMillis>.<ext>" — never a URL
    contentType: "image/svg+xml" | "image/png" | "image/jpeg" | "image/webp"
  },
  createdAt: Date, updatedAt: Date
}
```

The logo file lives in `S3_BUCKET` and is served by the CDN. The key's extension always matches `contentType`, which is also the object's S3 `Content-Type`. Every upload gets a fresh key, so replacing a logo never needs a CDN invalidation; the old object is deleted once the document points at the new one. The website never receives the opponents list: `results.json` is enriched at publish time with each game's opponent name and, when there is one, `logoImage` = the logo key.

### UpcomingGame — new (add-upcoming-games)

```ts
{
  _id: string,             // "UPG######"
  opponentId: string,      // → Opponent; name and logo resolved at read/publish time
  date: string,            // "YYYY-MM-DD", UK wall-clock — a string, not a Date, so no BST/GMT conversion
  time: string,            // "HH:mm", 24-hour, UK wall-clock
  location: "HOME" | "AWAY",
  venue?: string,          // required for AWAY, absent for HOME (the home rink is a publish-time constant)
  type: "CHALLENGE" | "LLIHC" | "BOTBC",
  createdAt: Date, updatedAt: Date
}
```

The scheduled fixture list, published as `upcoming-games.json`. Games dated before today stay in the collection (listed under Past on `/upcoming-games`) but are left out of the published file. Not linked to `Game`: the result is still entered as a new game once it's played.

### Publishes — new

```ts
{
  _id: string,             // "PUB######"
  startedAt: Date, completedAt: Date,
  artifacts: [{ path: string, checksum: string, changed: boolean }],
  status: "success" | "failed",
  error?: string
}
```

Latest successful document drives the unpublished-changes indicator.

### ApiKeys — retired

Used by the old export system. Untouched during migration; deleted on 2026-09-26 once the old services were decommissioned.

## Enums

**Position:** `Forward`, `Defence`, `Goaltender`.

**GameType:** `CHALLENGE`, `BOTBC`, `LLIHC` selectable; `NIHC` valid on historical games only (3 games in 24/25).

**GoalType:**

| Code | Label | In data today |
|---|---|---|
| `EVEN` | Even Strength | 732 |
| `PP` | Power Play | 52 |
| `SH` | Short Handed | 27 |
| `PS` | Penalty Shot | new (PRD) |
| `EN` | Empty Net | new (PRD) |
| `SO` | Shootout | 5 |

**PenaltyCode** (extracted from the live data — labels are best-guess and need confirmation where marked):

| Code | Label | Count |
|---|---|---|
| `TRIP` | Tripping | 121 |
| `ROUGH` | Roughing | 73 |
| `CHECK` | Checking | 44 |
| `CROSS` | Cross-Checking | 40 |
| `HOOK` | Hooking | 39 |
| `INTRF` | Interference | 38 |
| `TOOM` | Too Many Men | 35 |
| `HOLD` | Holding | 25 |
| `SLASH` | Slashing | 24 |
| `BDYCH` | Body Checking | 22 |
| `HIST` | High Sticking | 19 |
| `DELAY` | Delay of Game | 19 |
| `BOARD` | Boarding | 18 |
| `FIGHT` | Fighting | 16 |
| `UNSP` | Unsportsmanlike Conduct | 11 |
| `MISC` | Misconduct | 7 |
| `MATCH` | Match Penalty | 6 |
| `ELBOW` | Elbowing | 5 |
| `ILLEQUIP` | Illegal Equipment | 4 |
| `CHARG` | Charging | 3 |
| `KNEE` | Kneeing | 3 |
| `CHEB` | Checking from Behind | 2 |
| `AGGR` | Aggressor | 1 |
| `HOST` | Holding the Stick *(confirm)* | 1 |
| `ABUSE` | Abuse of Officials | 1 |
| `EMBEL` | Embellishment | 1 |
| `GOALINTRF` | Goaltender Interference | 1 |
| `THROWSTICK` | Throwing Stick | 1 |
| `RETAL` | Retaliation | 1 |

## Validation rules

- **Player:** number, when present, integer 1–99 (D9); required and unique among `active: true` players, optional for inactive players; `positions` non-empty.
- **Game roster:** only existing players; no duplicates. Removing a player who is referenced by a goal, assist, penalty, netminder, or award is blocked with a clear message until those references are removed.
- **Goals:** scorer/assists must be rostered; assists distinct from scorer and each other; `second` 0–59; minute within game length (60 regulation; SO goals sit outside periods).
- **Penalties:** offender rostered or the literal `BENCH`; duration > 0. Bench PIMs count toward team totals only.
- **Awards/netminder:** must be rostered.
- **Opponent:** name non-empty (trimmed) and unique ignoring case; logo optional, SVG/PNG/JPEG/WebP up to 5 MB. A game's or upcoming game's `opponentId` must reference an existing opponent, and an opponent any game or upcoming game references cannot be deleted.
- **UpcomingGame:** a real calendar date and a valid 24-hour time; a venue for away games and none for home games; NIHC can't be scheduled.
- **Season:** id `SSN` + 4 digits; name `##/##`; both consistent with each other; `active`, when present, is a boolean.

## Derived stats (the stats engine)

All computed from `Game` documents — never stored as editable data:

- **Player season stats:** games played = rostered games in season; goals = goals with `scoredBy` = player; assists = goals where player is `assist1`/`assist2`; points = goals + assists; PIMs = Σ `duration` of their penalties; `manOfTheMatch` / `warriorOfTheGame` = count of games where awarded.
- **Team season stats:** games played = games in season; goals/assists/PIMs = team totals across games (bench PIMs included); goalsFor/goalsAgainst/wins/draws/losses = per-game `Score` totals (see below) summed and classified across the season — a shootout win counts as a win, not a draw.
- **Score:** team total = non-SO goals (+1 to the shootout winner if SO goals exist); same for opponent. Periods: goals bucketed by 20-minute running-clock periods (minute 0–19:59 → P1, 20–39:59 → P2, 40–59:59 → P3). Verified against sampled historical games; the migration reconciliation ([04](04-migration-plan.md)) validates it against **all** 85 stored scores before the stored field is dropped.

## Indexes

- `Game`: `{ seasonId: 1, date: -1 }`, `{ "team.roster.playerId": 1 }`, `{ "opponentTeam.opponentId": 1 }`, `{ updatedAt: -1 }`
- `Opponent`: unique `{ name: 1 }` with collation `{ locale: "en", strength: 2 }` (case-insensitive); `{ updatedAt: -1 }`
- `UpcomingGame`: `{ date: 1, time: 1 }`, `{ opponentId: 1 }`, `{ updatedAt: -1 }`
- `Player`: unique partial index on `{ number: 1 }` where `active: true`; `{ updatedAt: -1 }`
- `Seasons` / `Team`: `{ updatedAt: -1 }`

(Data volumes are tiny; indexes exist for correctness — the unique number constraint — more than speed.)
