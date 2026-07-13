import type { Db } from "mongodb";

// Idempotent: `createIndex` is a no-op when an identical index already
// exists, so this is safe to call on every seed run (see docs/03-data-model.md
// Indexes section) and, unchanged, against production during migration.
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("games").createIndex({ seasonId: 1, date: -1 }),
    db.collection("games").createIndex({ "team.roster.playerId": 1 }),
    db.collection("games").createIndex({ updatedAt: -1 }),
    db
      .collection("players")
      .createIndex(
        { number: 1 },
        { unique: true, partialFilterExpression: { active: true } },
      ),
    db.collection("players").createIndex({ updatedAt: -1 }),
    db.collection("seasons").createIndex({ updatedAt: -1 }),
    db.collection("team").createIndex({ updatedAt: -1 }),
  ]);
}
