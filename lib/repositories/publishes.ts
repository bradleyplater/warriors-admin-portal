import { getDb } from "../mongodb";
import {
  PublishesSchema,
  PublishesCreateInputSchema,
  type Publishes,
  type PublishesCreateInput,
} from "../schemas";
import { generateTopLevelId } from "./internal/ids";

// Publishes are append-only — no `update`/`delete` (see docs/03-data-model.md).
async function collection() {
  const db = await getDb();
  return db.collection<Publishes>("publishes");
}

export async function createPublish(
  input: PublishesCreateInput,
): Promise<Publishes> {
  const data = PublishesCreateInputSchema.parse(input);
  const col = await collection();

  const doc = await generateTopLevelId("PUB", async (id) => {
    const candidate: Publishes = { _id: id, ...data };
    await col.insertOne(candidate);
    return candidate;
  });
  return PublishesSchema.parse(doc);
}

export async function getPublish(id: string): Promise<Publishes | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? PublishesSchema.parse(doc) : null;
}

export async function listPublishes(): Promise<Publishes[]> {
  const col = await collection();
  const docs = await col.find().sort({ completedAt: -1 }).toArray();
  return docs.map((doc) => PublishesSchema.parse(doc));
}
