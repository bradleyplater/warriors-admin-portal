import { getDb } from "../mongodb";
import {
  UpcomingGameCreateInputSchema,
  UpcomingGameSchema,
  type UpcomingGame,
  type UpcomingGameCreateInput,
} from "../schemas";
import { stampCreate, stampUpdate } from "./internal/audit";
import { generateTopLevelId } from "./internal/ids";
import { NotFoundError } from "./internal/errors";
import { COLLECTION_NAMES } from "./internal/collections";

async function collection() {
  const db = await getDb();
  return db.collection<UpcomingGame>(COLLECTION_NAMES.upcomingGame);
}

export async function createUpcomingGame(
  input: UpcomingGameCreateInput,
): Promise<UpcomingGame> {
  const data = UpcomingGameCreateInputSchema.parse(input);
  const col = await collection();

  const doc = await generateTopLevelId("UPG", async (id) => {
    const candidate: UpcomingGame = { _id: id, ...data, ...stampCreate() };
    await col.insertOne(candidate);
    return candidate;
  });
  return UpcomingGameSchema.parse(doc);
}

export async function getUpcomingGame(id: string): Promise<UpcomingGame | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? UpcomingGameSchema.parse(doc) : null;
}

// Soonest first. "YYYY-MM-DD" and "HH:mm" sort correctly as strings.
export async function listUpcomingGames(): Promise<UpcomingGame[]> {
  const col = await collection();
  const docs = await col.find().sort({ date: 1, time: 1 }).toArray();
  return docs.map((doc) => UpcomingGameSchema.parse(doc));
}

// Replaces the whole document rather than $set-merging, so switching an
// away game to home actually drops its venue.
export async function updateUpcomingGame(
  id: string,
  input: UpcomingGameCreateInput,
): Promise<UpcomingGame> {
  const col = await collection();
  const existing = await col.findOne({ _id: id });
  if (!existing) {
    throw new NotFoundError("upcoming game", id);
  }

  const data = UpcomingGameCreateInputSchema.parse(input);
  const validated = UpcomingGameSchema.parse({
    _id: id,
    ...data,
    createdAt: existing.createdAt,
    ...stampUpdate(),
  });
  await col.replaceOne({ _id: id }, validated);
  return validated;
}

export async function deleteUpcomingGame(id: string): Promise<void> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new NotFoundError("upcoming game", id);
  }
}

// Blocks deleting an opponent that a scheduled game still points at —
// otherwise the next publish would fail on the dangling reference.
export async function countUpcomingGamesByOpponentId(
  opponentId: string,
): Promise<number> {
  const col = await collection();
  return col.countDocuments({ opponentId });
}

// The unpublished-changes indicator's per-collection freshness check.
export async function getUpcomingGamesLatestUpdatedAt(): Promise<Date | null> {
  const col = await collection();
  const [doc] = await col.find().sort({ updatedAt: -1 }).limit(1).toArray();
  return doc?.updatedAt ?? null;
}
