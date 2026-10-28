import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { getS3Client } from "../../lib/s3";
import {
  addGamePhoto,
  createGame,
  deleteGame,
  getGame,
} from "../../lib/repositories";
import { deleteGamePhoto, uploadGamePhoto } from "../../lib/games/photos-service";
import { deletePhotoQuietly } from "../../lib/game-photos";

// Runs against the local Docker Mongo + S3 emulator, like opponent-service.test.ts.

async function jpeg(width = 3000, height = 2000): Promise<Blob> {
  const bytes = await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } },
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

describe("game photos service", () => {
  const createdGameIds: string[] = [];
  const keysToClean: string[] = [];

  afterEach(async () => {
    for (const key of keysToClean.splice(0)) await deletePhotoQuietly(key);
    for (const id of createdGameIds.splice(0)) {
      const game = await getGame(id);
      for (const photo of game?.photos ?? []) await deletePhotoQuietly(photo.key);
      await deleteGame(id).catch(() => undefined);
    }
  });

  async function newGame() {
    const game = await createGame({
      date: new Date("2026-10-12"),
      seasonId: "SSNTEST",
      type: "CHALLENGE",
      location: "HOME",
      team: { id: "TM551420", roster: [], goals: [], penalties: [] },
      opponentTeam: { opponentId: "OPN000001", goals: [], penalties: [] },
    });
    createdGameIds.push(game._id);
    return game;
  }

  it("processes, stores and records an uploaded photo", async () => {
    const game = await newGame();

    const result = await uploadGamePhoto(game._id, await jpeg());
    if (!result.ok) throw new Error(result.error);

    const [photo] = result.game.photos ?? [];
    expect(photo.key).toMatch(new RegExp(`^games/${game._id}/photos/.+\\.webp$`));

    const object = await getS3Client().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: photo.key }),
    );
    expect(object.ContentType).toBe("image/webp");
    const stored = await sharp(await object.Body!.transformToByteArray()).metadata();
    expect([stored.format, stored.width, stored.height]).toEqual(["webp", 2025, 1350]);
  });

  it("refuses a full game without leaving anything in S3", async () => {
    const game = await newGame();
    for (let i = 0; i < 6; i++) {
      await addGamePhoto(game._id, `games/${game._id}/photos/seed${i}.webp`);
    }

    const result = await uploadGamePhoto(game._id, await jpeg(400, 300));
    expect(result).toEqual({ ok: false, error: "A game can have at most 6 photos" });
    expect((await getGame(game._id))?.photos).toHaveLength(6);
  });

  it("writes nothing for a rejected file", async () => {
    const game = await newGame();
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#000" },
    })
      .gif()
      .toBuffer();

    const result = await uploadGamePhoto(game._id, new Blob([new Uint8Array(gif)]));
    expect(result.ok).toBe(false);
    expect((await getGame(game._id))?.photos ?? []).toHaveLength(0);
  });

  it("removes the photo from the game and deletes its object", async () => {
    const game = await newGame();
    const uploaded = await uploadGamePhoto(game._id, await jpeg(800, 600));
    if (!uploaded.ok) throw new Error(uploaded.error);
    const key = uploaded.game.photos![0].key;
    expect(await objectExists(key)).toBe(true);

    const updated = await deleteGamePhoto(game._id, key);
    expect(updated.photos).toEqual([]);
    expect(await objectExists(key)).toBe(false);
  });
});
