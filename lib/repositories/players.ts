import { getDb } from "../mongodb";
import {
  PlayerSchema,
  PlayerCreateInputSchema,
  type Player,
  type PlayerCreateInput,
} from "../schemas";
import { stampCreate, stampUpdate } from "./internal/audit";
import { generateTopLevelId, isDuplicateKeyErrorForField } from "./internal/ids";
import { DuplicateShirtNumberError, NotFoundError } from "./internal/errors";

async function collection() {
  const db = await getDb();
  return db.collection<Player>("players");
}

export async function createPlayer(input: PlayerCreateInput): Promise<Player> {
  const data = PlayerCreateInputSchema.parse(input);
  const col = await collection();

  const doc = await generateTopLevelId("PLR", async (id) => {
    const candidate: Player = { _id: id, ...data, ...stampCreate() };
    try {
      await col.insertOne(candidate);
    } catch (error) {
      if (isDuplicateKeyErrorForField(error, "number")) {
        throw new DuplicateShirtNumberError(candidate.number);
      }
      throw error;
    }
    return candidate;
  });
  return PlayerSchema.parse(doc);
}

export async function getPlayer(id: string): Promise<Player | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? PlayerSchema.parse(doc) : null;
}

export async function listPlayers(): Promise<Player[]> {
  const col = await collection();
  const docs = await col.find().toArray();
  return docs.map((doc) => PlayerSchema.parse(doc));
}

export async function updatePlayer(
  id: string,
  input: Partial<PlayerCreateInput>,
): Promise<Player> {
  const col = await collection();
  let result;
  try {
    result = await col.findOneAndUpdate(
      { _id: id },
      { $set: { ...input, ...stampUpdate() } },
      { returnDocument: "after" },
    );
  } catch (error) {
    if (isDuplicateKeyErrorForField(error, "number") && input.number !== undefined) {
      throw new DuplicateShirtNumberError(input.number);
    }
    throw error;
  }
  if (!result) {
    throw new NotFoundError("player", id);
  }
  return PlayerSchema.parse(result);
}

export async function deletePlayer(id: string): Promise<void> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new NotFoundError("player", id);
  }
}
