# Golden fixtures

The JSON files the public website currently reads, copied byte-for-byte out of
the [website repo](../../../warriors-website)'s `public/data/` directory. This
is Phase 0 of the [build roadmap](../../docs/07-build-roadmap.md): these files
are the fixed contract the publish pipeline (KAN-30/31/32) must reproduce.

MongoDB is the source of truth; these are a snapshot of what the website
consumed at capture time, not something regenerated from the database. Do not
hand-edit them — see [Updating](#updating) below.

| File | Contains | Consumed by (in `warriors-website/app/`) |
| --- | --- | --- |
| `awards.json` | Per-season awards evenings: title, images, and tiered award/winner/playerId entries | `routes/awards.tsx` |
| `players.json` | Every player: id, name, number, position, and per-season stat lines (games, goals, assists, pims, points, optional warriorOfTheGame/manOfTheMatch counts) | `contexts/DataContext.tsx`, `components/LatestResultCard`, `components/SeasonLeaders`, `routes/{game,player,records,results,roster,stats}.tsx` |
| `results.json` | Every played game: opponent, date, roster, full score breakdown by period (goals, assists, penalties, both teams) | `contexts/DataContext.tsx`, `components/LatestResultCard`, `components/ScheduleGameCard`, `components/NextGameCard`, `routes/{game,player,records,results,roster,stats,team-stats}.tsx` |
| `roster-config.json` | `activePlayers`: the list of player IDs on the current roster, used to filter `players.json` down to who's currently active | `routes/roster.tsx` |
| `team.json` | Team-level season stats: games, goalsFor/Against, wins/draws/losses | `contexts/DataContext.tsx` |
| `upcoming-games.json` | Scheduled future games: opponent, date, time, location, game type | `contexts/DataContext.tsx`, `components/NextGameCard`, `routes/schedule.tsx` |

## Not captured

`team-config.json` (`{ leadership: { captain, assistants } }`) exists in the
website's `public/data/` but is not read anywhere in `warriors-website/app` —
no import, no fetch, no dynamic path construction referencing it. It isn't
part of the JSON contract the website actually depends on, so it's
deliberately excluded here. If a future change makes the website read it,
capture it then.

## Updating

These fixtures are a point-in-time capture, not a live sync. Only refresh them
deliberately (e.g. the website's JSON shapes change) by re-copying from the
website repo and updating this table — never hand-edit the JSON files
themselves, since `golden-fixtures.test.ts` checks each file is named here.
