import { getDb } from "../mongodb";
import {
  ReconciliationResolutionSchema,
  ReconciliationResolutionCreateInputSchema,
  type ReconciliationResolution,
  type ReconciliationResolutionCreateInput,
} from "../schemas";
import { generateTopLevelId } from "./internal/ids";

// A new collection this app introduces itself — no legacy counterpart, so
// it needs no entry in COLLECTION_NAMES (see that file's comment). Append-
// only, like Publishes: a resolution is never edited or deleted, only
// superseded by a fresh report where it no longer matches (see the schema's
// field comment for why matching is by value, not just key).
async function collection() {
  const db = await getDb();
  return db.collection<ReconciliationResolution>("reconciliationResolutions");
}

export async function createReconciliationResolution(
  input: ReconciliationResolutionCreateInput,
): Promise<ReconciliationResolution> {
  const data = ReconciliationResolutionCreateInputSchema.parse(input);
  const col = await collection();

  const doc = await generateTopLevelId("RCN", async (id) => {
    const candidate: ReconciliationResolution = { _id: id, ...data };
    await col.insertOne(candidate);
    return candidate;
  });
  return ReconciliationResolutionSchema.parse(doc);
}

export async function listReconciliationResolutions(): Promise<
  ReconciliationResolution[]
> {
  const col = await collection();
  const docs = await col.find().toArray();
  return docs.map((doc) => ReconciliationResolutionSchema.parse(doc));
}
