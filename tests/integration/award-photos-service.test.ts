import { HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { getS3Client } from "../../lib/s3";
import {
  addAwardEntry,
  createAwardEvening,
  getAwardEvening,
} from "../../lib/repositories";
import {
  deleteAwardEntry,
  deleteAwardPhoto,
  uploadAwardPhoto,
} from "../../lib/awards/photos-service";
import { deletePhotoQuietly } from "../../lib/game-photos";

// Runs against the local Docker Mongo + S3 emulator, like
// game-photos-service.test.ts.

async function jpeg(width = 1600, height = 2000): Promise<Blob> {
  const bytes = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 40, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

describe("award photos service", () => {
  const createdIds: string[] = [];
  const keysToClean: string[] = [];

  afterEach(async () => {
    for (const key of keysToClean.splice(0)) await deletePhotoQuietly(key);
    for (const id of createdIds.splice(0)) {
      const evening = await getAwardEvening(id);
      for (const entry of evening?.entries ?? []) {
        if (entry.photo) await deletePhotoQuietly(entry.photo.key);
      }
    }
    const db = await getDb();
    await db
      .collection<{ _id: string }>("AwardEvening")
      .deleteMany({
        _id: { $in: ["EVE9091", "EVE9192", "EVE9293", "EVE9394"] },
      });
  });

  async function newEntry(seasonId: string) {
    const evening = await createAwardEvening(seasonId);
    createdIds.push(evening._id);
    const entry = await addAwardEntry(evening._id, {
      category: "mvp",
      winners: [],
    });
    return { eveningId: evening._id, entryId: entry._id };
  }

  it("processes, stores and records a photo under the award's prefix", async () => {
    const { eveningId, entryId } = await newEntry("SSN9091");

    const result = await uploadAwardPhoto(eveningId, entryId, await jpeg());
    if (!result.ok) throw new Error(result.error);

    const key = result.entry.photo!.key;
    expect(key).toMatch(
      new RegExp(`^awards/${eveningId}/${entryId}/.+\\.webp$`),
    );
    expect(await objectExists(key)).toBe(true);
  });

  it("replaces an existing photo and deletes the old file", async () => {
    const { eveningId, entryId } = await newEntry("SSN9192");
    const first = await uploadAwardPhoto(eveningId, entryId, await jpeg());
    if (!first.ok) throw new Error(first.error);

    const second = await uploadAwardPhoto(eveningId, entryId, await jpeg());
    if (!second.ok) throw new Error(second.error);

    expect(second.entry.photo!.key).not.toBe(first.entry.photo!.key);
    expect(await objectExists(first.entry.photo!.key)).toBe(false);
    expect(await objectExists(second.entry.photo!.key)).toBe(true);
  });

  it("refuses a file that isn't an image without storing anything", async () => {
    const { eveningId, entryId } = await newEntry("SSN9293");

    const result = await uploadAwardPhoto(
      eveningId,
      entryId,
      new Blob(["not an image"], { type: "image/jpeg" }),
    );

    expect(result.ok).toBe(false);
    const evening = await getAwardEvening(eveningId);
    expect(evening?.entries[0]?.photo).toBeUndefined();
  });

  it("refuses an award that doesn't exist", async () => {
    const result = await uploadAwardPhoto("EVE9999", "AWD000000", await jpeg());
    expect(result).toEqual({ ok: false, error: "Award not found" });
  });

  it("deletes the photo, then the award with its photo", async () => {
    const { eveningId, entryId } = await newEntry("SSN9394");
    const uploaded = await uploadAwardPhoto(eveningId, entryId, await jpeg());
    if (!uploaded.ok) throw new Error(uploaded.error);
    const firstKey = uploaded.entry.photo!.key;

    await deleteAwardPhoto(eveningId, entryId);
    expect(
      (await getAwardEvening(eveningId))?.entries[0]?.photo,
    ).toBeUndefined();
    expect(await objectExists(firstKey)).toBe(false);

    const again = await uploadAwardPhoto(eveningId, entryId, await jpeg());
    if (!again.ok) throw new Error(again.error);
    await deleteAwardEntry(eveningId, entryId);
    expect((await getAwardEvening(eveningId))?.entries).toEqual([]);
    expect(await objectExists(again.entry.photo!.key)).toBe(false);
  });
});
