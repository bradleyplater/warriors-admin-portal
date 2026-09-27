import type { Db } from "mongodb";
import { COLLECTION_NAMES } from "./collections";

// Idempotent: `createIndex` is a no-op when an identical index already
// exists, so this is safe to call on every seed run (see docs/03-data-model.md
// Indexes section) and, unchanged, against production during migration.
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection(COLLECTION_NAMES.game).createIndex({ seasonId: 1, date: -1 }),
    db.collection(COLLECTION_NAMES.game).createIndex({ "team.roster.playerId": 1 }),
    db.collection(COLLECTION_NAMES.game).createIndex({ updatedAt: -1 }),
    db.collection(COLLECTION_NAMES.game).createIndex({ "opponentTeam.opponentId": 1 }),
    // Case-insensitive uniqueness, so "cleveland comets" can't sit alongside
    // "Cleveland Comets" — the variant problem this collection exists to fix.
    db
      .collection(COLLECTION_NAMES.opponent)
      .createIndex(
        { name: 1 },
        { unique: true, collation: { locale: "en", strength: 2 } },
      ),
    db.collection(COLLECTION_NAMES.opponent).createIndex({ updatedAt: -1 }),
    db
      .collection(COLLECTION_NAMES.player)
      .createIndex(
        { number: 1 },
        { unique: true, partialFilterExpression: { active: true } },
      ),
    db.collection(COLLECTION_NAMES.player).createIndex({ updatedAt: -1 }),
    db.collection(COLLECTION_NAMES.seasons).createIndex({ updatedAt: -1 }),
    db.collection(COLLECTION_NAMES.team).createIndex({ updatedAt: -1 }),
  ]);
}
