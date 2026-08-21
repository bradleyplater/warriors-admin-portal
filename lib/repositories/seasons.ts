import { getDb } from "../mongodb";
import {
  SeasonSchema,
  SeasonCreateInputSchema,
  type Season,
  type SeasonCreateInput,
} from "../schemas";
import { stampCreate } from "./internal/audit";
import { isDuplicateKeyErrorForField } from "./internal/ids";
import { DuplicateSeasonError } from "./internal/errors";
import { COLLECTION_NAMES } from "./internal/collections";

async function collection() {
  const db = await getDb();
  return db.collection<Season>(COLLECTION_NAMES.seasons);
}

// Seasons ids are derived from their name ("25/26" -> "SSN2526"), not
// randomly generated — see design.md's "Season ids are deterministic" decision.
function idFromName(name: string): string {
  return `SSN${name.replace("/", "")}`;
}

export async function createSeason(input: SeasonCreateInput): Promise<Season> {
  const data = SeasonCreateInputSchema.parse(input);
  const doc: Season = { _id: idFromName(data.name), ...data, ...stampCreate() };
  const validated = SeasonSchema.parse(doc);

  const col = await collection();
  try {
    await col.insertOne(validated);
  } catch (error) {
    if (isDuplicateKeyErrorForField(error, "_id")) {
      throw new DuplicateSeasonError(validated._id);
    }
    throw error;
  }
  return validated;
}

export async function getSeason(id: string): Promise<Season | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? SeasonSchema.parse(doc) : null;
}

export async function listSeasons(): Promise<Season[]> {
  const col = await collection();
  const docs = await col.find().toArray();
  return docs.map((doc) => SeasonSchema.parse(doc));
}

// The unpublished-changes indicator's per-collection freshness check (see
// docs/02-architecture.md#the-publish-pipeline) — served by the
// { updatedAt: -1 } index in internal/indexes.ts.
export async function getSeasonsLatestUpdatedAt(): Promise<Date | null> {
  const col = await collection();
  const [doc] = await col
    .find()
    .sort({ updatedAt: -1 })
    .limit(1)
    .toArray();
  return doc?.updatedAt ?? null;
}
