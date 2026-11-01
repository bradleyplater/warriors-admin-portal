import { randomBytes } from "node:crypto";
import {
  getAwardEvening,
  NotFoundError,
  removeAwardEntry,
  setAwardEntryPhoto,
} from "../repositories";
import type { AwardEntry } from "../schemas";
import {
  deletePhotoQuietly,
  MAX_PHOTO_BYTES,
  processPhoto,
  uploadPhoto,
} from "../game-photos";

// A fresh key per upload, as for game photos: objects are never
// overwritten, so the CDN never needs invalidating.
export function buildAwardPhotoKey(
  eveningId: string,
  entryId: string,
  now: Date = new Date(),
): string {
  return `awards/${eveningId}/${entryId}/${now.getTime()}-${randomBytes(3).toString("hex")}.webp`;
}

export type AwardPhotoUploadResult =
  { ok: true; entry: AwardEntry } | { ok: false; error: string };

// Same processing as game photos (resized WebP, location data removed).
// An award has at most one photo, so uploading replaces the current one:
// the new object is stored and recorded first, and only then is the old
// one deleted, so the entry never points at a missing file.
export async function uploadAwardPhoto(
  eveningId: string,
  entryId: string,
  file: Blob,
): Promise<AwardPhotoUploadResult> {
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo must be 25 MB or smaller" };
  }

  const evening = await getAwardEvening(eveningId);
  const current = evening?.entries.find((entry) => entry._id === entryId);
  if (!current) {
    return { ok: false, error: "Award not found" };
  }

  const processed = await processPhoto(
    new Uint8Array(await file.arrayBuffer()),
  );
  if (!processed.ok) {
    return processed;
  }

  const key = buildAwardPhotoKey(eveningId, entryId);
  await uploadPhoto(key, processed.body);
  let entry: AwardEntry;
  try {
    entry = await setAwardEntryPhoto(eveningId, entryId, { key });
  } catch (error) {
    await deletePhotoQuietly(key);
    if (error instanceof NotFoundError) {
      return { ok: false, error: "Award not found" };
    }
    throw error;
  }
  if (current.photo) {
    await deletePhotoQuietly(current.photo.key);
  }
  return { ok: true, entry };
}

// The document goes first, then the object (best-effort), so a failed S3
// delete can only ever leave a harmless orphan.
export async function deleteAwardPhoto(
  eveningId: string,
  entryId: string,
): Promise<void> {
  const evening = await getAwardEvening(eveningId);
  const photo = evening?.entries.find((entry) => entry._id === entryId)?.photo;
  if (!photo) {
    return;
  }
  await setAwardEntryPhoto(eveningId, entryId, undefined);
  await deletePhotoQuietly(photo.key);
}

// Removes the award, then its photo (best-effort), for the same reason.
export async function deleteAwardEntry(
  eveningId: string,
  entryId: string,
): Promise<void> {
  const removed = await removeAwardEntry(eveningId, entryId);
  if (removed.photo) {
    await deletePhotoQuietly(removed.photo.key);
  }
}
