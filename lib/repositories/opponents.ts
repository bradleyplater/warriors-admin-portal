import { getDb } from "../mongodb";
import {
  OpponentCreateInputSchema,
  OpponentSchema,
  type Opponent,
  type OpponentCreateInput,
  type OpponentLogo,
} from "../schemas";
import { stampCreate, stampUpdate } from "./internal/audit";
import { generateTopLevelId, isDuplicateKeyErrorForField } from "./internal/ids";
import { DuplicateOpponentNameError, NotFoundError } from "./internal/errors";
import { COLLECTION_NAMES } from "./internal/collections";

// Matches the collation of the unique { name: 1 } index (internal/indexes.ts),
// so name lookups agree with what the index considers a duplicate.
const NAME_COLLATION = { locale: "en", strength: 2 } as const;

async function collection() {
  const db = await getDb();
  return db.collection<Opponent>(COLLECTION_NAMES.opponent);
}

function translateDuplicateName(error: unknown, name: string): never {
  if (isDuplicateKeyErrorForField(error, "name")) {
    throw new DuplicateOpponentNameError(name);
  }
  throw error;
}

export async function createOpponent(
  input: OpponentCreateInput,
): Promise<Opponent> {
  const data = OpponentCreateInputSchema.parse(input);
  const col = await collection();

  const doc = await generateTopLevelId("OPN", async (id) => {
    const candidate: Opponent = { _id: id, ...data, ...stampCreate() };
    try {
      await col.insertOne(candidate);
    } catch (error) {
      translateDuplicateName(error, data.name);
    }
    return candidate;
  });
  return OpponentSchema.parse(doc);
}

export async function getOpponent(id: string): Promise<Opponent | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? OpponentSchema.parse(doc) : null;
}

// Case-insensitive, trimmed — "cleveland comets " finds "Cleveland Comets".
export async function findOpponentByName(
  name: string,
): Promise<Opponent | null> {
  const col = await collection();
  const doc = await col.findOne(
    { name: name.trim() },
    { collation: NAME_COLLATION },
  );
  return doc ? OpponentSchema.parse(doc) : null;
}

export async function listOpponents(): Promise<Opponent[]> {
  const col = await collection();
  const docs = await col
    .find()
    .collation(NAME_COLLATION)
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => OpponentSchema.parse(doc));
}

// The unpublished-changes indicator's per-collection freshness check —
// opponent names and logos feed results.json, so a rename must count as an
// unpublished change just like a game edit does.
export async function getOpponentsLatestUpdatedAt(): Promise<Date | null> {
  const col = await collection();
  const [doc] = await col.find().sort({ updatedAt: -1 }).limit(1).toArray();
  return doc?.updatedAt ?? null;
}

export interface OpponentUpdateInput {
  name?: string;
  logo?: OpponentLogo;
}

export async function updateOpponent(
  id: string,
  patch: OpponentUpdateInput,
): Promise<Opponent> {
  const col = await collection();
  const existing = await col.findOne({ _id: id });
  if (!existing) {
    throw new NotFoundError("opponent", id);
  }

  const validated = OpponentSchema.parse({
    ...existing,
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.logo !== undefined && { logo: patch.logo }),
    ...stampUpdate(),
  });
  try {
    await col.replaceOne({ _id: id }, validated);
  } catch (error) {
    translateDuplicateName(error, validated.name);
  }
  return validated;
}

export async function deleteOpponent(id: string): Promise<void> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new NotFoundError("opponent", id);
  }
}
