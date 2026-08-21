// The real Mongo collection names in the legacy HockeyTracker production
// database (confirmed 2026-08-21 via a read-only listCollections() check) —
// Player and Game are singular, all four are capitalised. This app had
// assumed lowercase/plural names (players/games/team/seasons) since KAN-13,
// which matched nothing in production: every repository read against a
// database, correctly connected, that simply had no documents under those
// names, so every page silently showed empty rather than erroring.
// `ApiKeys` (a legacy collection this app never writes to, only backs up
// generically via listCollections()) already matched and needs no entry
// here — see lib/backup/run.ts. `publishes` is a new collection this app
// introduced itself and has no legacy counterpart, so it's unaffected.
export const COLLECTION_NAMES = {
  player: "Player",
  game: "Game",
  team: "Team",
  seasons: "Seasons",
} as const;
