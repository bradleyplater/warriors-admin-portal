import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { MongoClient } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { getS3Client } from "../../lib/s3";
import { runBackup } from "../../lib/backup/run";
import { runRestore } from "../../lib/backup/restore";

// Proves the full backup -> restore round trip against the real local Docker
// Mongo + MinIO (see docs/06-local-development.md) — no mocking, matching
// this repo's existing integration-test convention for infra with a local
// equivalent. Restores into an isolated throwaway database rather than the
// shared HockeyTracker the rest of the suite depends on.
describe("runBackup / runRestore", () => {
  const restoreTargetUri = `${process.env.MONGODB_URI!.replace(/\/[^/]+$/, "")}/HockeyTracker_restore_test`;
  const createdPrefixes: string[] = [];

  afterEach(async () => {
    const client = new MongoClient(restoreTargetUri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    await client.db().dropDatabase();
    await client.close();

    const bucket = process.env.S3_BUCKET!;
    for (const prefix of createdPrefixes.splice(0)) {
      const listed = await getS3Client().send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/` }),
      );
      const keys = (listed.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => !!key);
      if (keys.length > 0) {
        await getS3Client().send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          }),
        );
      }
    }
  });

  it("backs up every collection to S3 and restores it into a target database unchanged", async () => {
    const backup = await runBackup();
    createdPrefixes.push(backup.prefix);

    expect(backup.collections.length).toBeGreaterThan(0);
    const playersBackup = backup.collections.find((c) => c.name === "players");
    expect(playersBackup).toBeDefined();
    expect(playersBackup!.documentCount).toBeGreaterThan(0);

    const bucket = process.env.S3_BUCKET!;
    const listed = await getS3Client().send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: `${backup.prefix}/` }),
    );
    const uploadedKeys = (listed.Contents ?? []).map((object) => object.Key);
    expect(uploadedKeys).toContain(`${backup.prefix}/manifest.json`);
    expect(uploadedKeys).toContain(`${backup.prefix}/players.json`);

    const restoreClient = new MongoClient(restoreTargetUri, { serverSelectionTimeoutMS: 3000 });
    await restoreClient.connect();
    try {
      const restore = await runRestore(backup.prefix, restoreClient.db());

      expect(restore.collections).toHaveLength(backup.collections.length);
      for (const expected of backup.collections) {
        const actual = restore.collections.find((c) => c.name === expected.name);
        expect(actual?.documentCount).toBe(expected.documentCount);
      }

      const sourceClient = new MongoClient(process.env.MONGODB_URI!, {
        serverSelectionTimeoutMS: 3000,
      });
      await sourceClient.connect();
      try {
        const sourcePlayers = await sourceClient
          .db()
          .collection("players")
          .find({})
          .sort({ _id: 1 })
          .toArray();
        const restoredPlayers = await restoreClient
          .db()
          .collection("players")
          .find({})
          .sort({ _id: 1 })
          .toArray();
        expect(restoredPlayers).toEqual(sourcePlayers);
      } finally {
        await sourceClient.close();
      }
    } finally {
      await restoreClient.close();
    }
  });

  it("a second restore into the same target replaces rather than duplicates", async () => {
    const backup = await runBackup();
    createdPrefixes.push(backup.prefix);

    const restoreClient = new MongoClient(restoreTargetUri, { serverSelectionTimeoutMS: 3000 });
    await restoreClient.connect();
    try {
      await runRestore(backup.prefix, restoreClient.db());
      const second = await runRestore(backup.prefix, restoreClient.db());

      const playersExpected = backup.collections.find((c) => c.name === "players")!.documentCount;
      const playersSecond = second.collections.find((c) => c.name === "players")!;
      expect(playersSecond.documentCount).toBe(playersExpected);

      const actualCount = await restoreClient.db().collection("players").countDocuments();
      expect(actualCount).toBe(playersExpected);
    } finally {
      await restoreClient.close();
    }
  });
});
