import type { Db, Document } from "mongodb";
import { getDb } from "../../mongodb";
import { mapLegacyPosition } from "./position-mapping";
import { GameTypeSchema } from "../../schemas/enums";
import { COLLECTION_NAMES } from "../../repositories/internal/collections";

export type MigrationCollectionName =
  (typeof COLLECTION_NAMES)[keyof typeof COLLECTION_NAMES];

const COLLECTIONS: MigrationCollectionName[] = [
  COLLECTION_NAMES.player,
  COLLECTION_NAMES.game,
  COLLECTION_NAMES.team,
  COLLECTION_NAMES.seasons,
];

export interface AdditivePatch {
  patch: Record<string, unknown> | null;
  error?: string;
}

// Computes the $set patch that would additively bring `doc` up to date, or
// null if nothing is missing. Presence-based (not value-recomputed) for the
// additive fields, since re-deriving createdAt/updatedAt would never compare
// equal to a freshly-computed "now" — that's what makes a second run a true
// no-op (docs/04-migration-plan.md Step 1, rule 3). Game.type casing is the
// one value-normalisation exception, reviewed via dry-run per the plan.
// On error, the whole document is skipped — no partial patch — so it can be
// retried once the underlying data problem is fixed (rule 4: nothing is
// overwritten without sign-off).
export function computeAdditivePatch(
  doc: Document,
  collection: MigrationCollectionName,
): AdditivePatch {
  const patch: Record<string, unknown> = {};
  const now = new Date();

  if (doc.createdAt === undefined) {
    patch.createdAt = now;
  }
  if (doc.updatedAt === undefined) {
    patch.updatedAt = now;
  }

  if (collection === COLLECTION_NAMES.player) {
    if (doc.positions === undefined) {
      if (typeof doc.position !== "string") {
        return {
          patch: null,
          error: `Player ${String(doc._id)} has neither "positions" nor a legacy "position" string to map`,
        };
      }
      try {
        patch.positions = mapLegacyPosition(doc.position);
      } catch (error) {
        return {
          patch: null,
          error: `Player ${String(doc._id)}: ${(error as Error).message}`,
        };
      }
    }

    if (doc.teamId === undefined || doc.number === undefined) {
      const legacyTeam = Array.isArray(doc.teams) ? doc.teams[0] : undefined;
      if (!legacyTeam) {
        return {
          patch: null,
          error: `Player ${String(doc._id)} has neither teamId/number nor a legacy "teams" entry to lift them from`,
        };
      }
      if (doc.teamId === undefined) {
        patch.teamId = legacyTeam.teamId;
      }
      if (doc.number === undefined) {
        patch.number = legacyTeam.number;
      }
    }
  }

  if (collection === COLLECTION_NAMES.game && typeof doc.type === "string") {
    const normalised = doc.type.toUpperCase();
    if (normalised !== doc.type) {
      if (!GameTypeSchema.safeParse(normalised).success) {
        return {
          patch: null,
          error: `Game ${String(doc._id)} has an unrecognised type "${doc.type}"`,
        };
      }
      patch.type = normalised;
    }
  }

  return { patch: Object.keys(patch).length > 0 ? patch : null };
}

export interface CollectionSummary {
  name: MigrationCollectionName;
  documentCount: number;
  changedCount: number;
  changes: Array<{ id: unknown; patch: Record<string, unknown> }>;
  errors: string[];
}

export interface AdditiveMigrationSummary {
  dryRun: boolean;
  collections: CollectionSummary[];
}

async function migrateCollection(
  db: Db,
  name: MigrationCollectionName,
  dryRun: boolean,
): Promise<CollectionSummary> {
  const col = db.collection(name);
  const docs = await col.find({}).toArray();

  const summary: CollectionSummary = {
    name,
    documentCount: docs.length,
    changedCount: 0,
    changes: [],
    errors: [],
  };

  for (const doc of docs) {
    const { patch, error } = computeAdditivePatch(doc, name);
    if (error) {
      summary.errors.push(error);
      continue;
    }
    if (!patch) {
      continue;
    }
    summary.changedCount++;
    summary.changes.push({ id: doc._id, patch });
    if (!dryRun) {
      await col.updateOne({ _id: doc._id }, { $set: patch });
    }
  }

  return summary;
}

// Migration Plan Step 1 (docs/04-migration-plan.md): additively backfills
// Player.positions/teamId/number, normalises Game.type casing, and backfills
// createdAt/updatedAt across Player/Game/Team/Seasons. Never touches or
// removes any legacy field. dryRun: true computes and reports every intended
// change without writing anything.
export async function runAdditiveMigration({
  dryRun,
}: {
  dryRun: boolean;
}): Promise<AdditiveMigrationSummary> {
  const db = await getDb();
  const collections = await Promise.all(
    COLLECTIONS.map((name) => migrateCollection(db, name, dryRun)),
  );
  return { dryRun, collections };
}
