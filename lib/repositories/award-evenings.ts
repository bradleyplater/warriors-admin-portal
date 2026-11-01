import { getDb } from "../mongodb";
import {
  AwardEntrySchema,
  AwardEveningSchema,
  eveningIdForSeason,
  type AwardEntry,
  type AwardEvening,
  type AwardEveningStatus,
  type AwardPhoto,
} from "../schemas";
import { stampCreate, stampUpdate } from "./internal/audit";
import {
  generateEmbeddedId,
  isDuplicateKeyErrorForField,
} from "./internal/ids";
import { DuplicateAwardEveningError, NotFoundError } from "./internal/errors";
import { COLLECTION_NAMES } from "./internal/collections";

// An entry's details. The photo has its own setter, so editing an award's
// winner can never drop its photo by omission.
export type AwardEntryInput = Omit<AwardEntry, "_id" | "photo">;

async function collection() {
  const db = await getDb();
  return db.collection<AwardEvening>(COLLECTION_NAMES.awardEvening);
}

// Drops keys set to undefined: the mongodb driver's default
// ignoreUndefined:false would store them as BSON null, which the schema's
// optional fields reject on the next read (same issue as games.ts).
function entryFrom(_id: string, input: AwardEntryInput, photo?: AwardPhoto) {
  const entry = Object.fromEntries(
    Object.entries({ _id, ...input, photo }).filter(
      ([, value]) => value !== undefined,
    ),
  );
  return AwardEntrySchema.parse(entry);
}

function newEntry(input: AwardEntryInput, existing: AwardEntry[]): AwardEntry {
  const id = generateEmbeddedId(
    "AWD",
    existing.map((entry) => entry._id),
  );
  return entryFrom(id, input);
}

// `entries` is for bulk creation (the legacy awards.json import); the admin
// UI creates an empty evening and adds entries one at a time.
export async function createAwardEvening(
  seasonId: string,
  options: { status?: AwardEveningStatus; entries?: AwardEntryInput[] } = {},
): Promise<AwardEvening> {
  const entries: AwardEntry[] = [];
  for (const input of options.entries ?? []) {
    entries.push(newEntry(input, entries));
  }
  const validated = AwardEveningSchema.parse({
    _id: eveningIdForSeason(seasonId),
    seasonId,
    status: options.status ?? "draft",
    entries,
    ...stampCreate(),
  });

  const col = await collection();
  try {
    await col.insertOne(validated);
  } catch (error) {
    if (isDuplicateKeyErrorForField(error, "_id")) {
      throw new DuplicateAwardEveningError(validated._id);
    }
    throw error;
  }
  return validated;
}

export async function getAwardEvening(
  id: string,
): Promise<AwardEvening | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  return doc ? AwardEveningSchema.parse(doc) : null;
}

// Oldest first. Evening ids carry the season's digits, so id order is
// season order.
export async function listAwardEvenings(): Promise<AwardEvening[]> {
  const col = await collection();
  const docs = await col.find().sort({ _id: 1 }).toArray();
  return docs.map((doc) => AwardEveningSchema.parse(doc));
}

// Loads the evening, applies `change` to a copy, and writes it back only if
// the whole document still validates.
async function modifyEvening(
  id: string,
  change: (evening: AwardEvening) => AwardEvening,
): Promise<AwardEvening> {
  const col = await collection();
  const existing = await col.findOne({ _id: id });
  if (!existing) {
    throw new NotFoundError("award evening", id);
  }
  const validated = AwardEveningSchema.parse({
    ...change(AwardEveningSchema.parse(existing)),
    ...stampUpdate(),
  });
  await col.replaceOne({ _id: id }, validated);
  return validated;
}

function entryIndex(evening: AwardEvening, entryId: string): number {
  const index = evening.entries.findIndex((entry) => entry._id === entryId);
  if (index === -1) {
    throw new NotFoundError("award entry", entryId);
  }
  return index;
}

export async function setAwardEveningStatus(
  id: string,
  status: AwardEveningStatus,
): Promise<AwardEvening> {
  return modifyEvening(id, (evening) => ({ ...evening, status }));
}

// Appended to the end; display order is array order.
export async function addAwardEntry(
  eveningId: string,
  input: AwardEntryInput,
): Promise<AwardEntry> {
  let added: AwardEntry | undefined;
  await modifyEvening(eveningId, (evening) => {
    added = newEntry(input, evening.entries);
    return { ...evening, entries: [...evening.entries, added] };
  });
  return added!;
}

// Replaces the entry's details, keeping its id, position and photo.
export async function updateAwardEntry(
  eveningId: string,
  entryId: string,
  input: AwardEntryInput,
): Promise<AwardEntry> {
  const evening = await modifyEvening(eveningId, (evening) => {
    const index = entryIndex(evening, entryId);
    const entries = [...evening.entries];
    entries[index] = entryFrom(entryId, input, evening.entries[index]!.photo);
    return { ...evening, entries };
  });
  return evening.entries[entryIndex(evening, entryId)]!;
}

// `undefined` removes the photo. Deleting the S3 object is the caller's job,
// as with game photos.
export async function setAwardEntryPhoto(
  eveningId: string,
  entryId: string,
  photo: AwardPhoto | undefined,
): Promise<AwardEntry> {
  const evening = await modifyEvening(eveningId, (evening) => {
    const index = entryIndex(evening, entryId);
    const current = evening.entries[index]!;
    const entries = [...evening.entries];
    // entryFrom puts `photo` last, so it replaces the current one.
    entries[index] = entryFrom(current._id, current, photo);
    return { ...evening, entries };
  });
  return evening.entries[entryIndex(evening, entryId)]!;
}

// Returns the removed entry so the caller can delete its photo from S3.
export async function removeAwardEntry(
  eveningId: string,
  entryId: string,
): Promise<AwardEntry> {
  let removed: AwardEntry | undefined;
  await modifyEvening(eveningId, (evening) => {
    removed = evening.entries[entryIndex(evening, entryId)];
    return {
      ...evening,
      entries: evening.entries.filter((entry) => entry._id !== entryId),
    };
  });
  return removed!;
}

// The unpublished-changes indicator's per-collection freshness check —
// served by the { updatedAt: -1 } index in internal/indexes.ts.
export async function getAwardEveningsLatestUpdatedAt(): Promise<Date | null> {
  const col = await collection();
  const [doc] = await col.find().sort({ updatedAt: -1 }).limit(1).toArray();
  return doc?.updatedAt ?? null;
}
