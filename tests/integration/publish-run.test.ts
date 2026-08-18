import { GetObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { getS3Client } from "../../lib/s3";
import { runPublish } from "../../lib/publish/run";
import { createPublish } from "../../lib/repositories";
import { PlayersArtifactSchema } from "../../lib/publish/schemas";
import type { Publishes } from "../../lib/schemas";

// Runs the real pipeline against the local Docker Mongo + MinIO (see
// docs/06-local-development.md) — no mocking, matching this repo's existing
// integration-test convention for infra with a local equivalent.
describe("runPublish", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length === 0) {
      return;
    }
    const db = await getDb();
    await db
      .collection<{ _id: string }>("publishes")
      .deleteMany({ _id: { $in: createdIds.splice(0) } });
  });

  // Seeds a deliberately-wrong "last successful publish" far enough in the
  // future to always win getLatestSuccessfulPublish's sort, guaranteeing the
  // next runPublish() call sees every artifact as changed — regardless of
  // whatever real publish history already exists in the shared dev database.
  async function seedStaleBaseline(yearsInFuture: number): Promise<Publishes> {
    const at = Date.now() + 1000 * 60 * 60 * 24 * 365 * yearsInFuture;
    const bogus = await createPublish({
      startedAt: new Date(at),
      completedAt: new Date(at + 1_000),
      artifacts: [
        { path: "players.json", checksum: "bogus", changed: true },
        { path: "roster-config.json", checksum: "bogus", changed: true },
        { path: "team.json", checksum: "bogus", changed: true },
        { path: "results.json", checksum: "bogus", changed: true },
      ],
      status: "success",
    });
    createdIds.push(bogus._id);
    return bogus;
  }

  it("uploads changed artifacts to S3, matching the artifact schema", async () => {
    await seedStaleBaseline(55);

    const publish = await runPublish();
    createdIds.push(publish._id);

    expect(publish.status).toBe("success");
    expect(publish.artifacts.every((a) => a.changed)).toBe(true);

    const bucket = process.env.S3_BUCKET;
    const response = await getS3Client().send(
      new GetObjectCommand({ Bucket: bucket, Key: "players.json" }),
    );
    const body = await response.Body?.transformToString();
    const parsed: unknown = JSON.parse(body ?? "");
    expect(() => PlayersArtifactSchema.parse(parsed)).not.toThrow();
  });

  it("a second run with unchanged data marks every artifact unchanged", async () => {
    const first = await runPublish();
    createdIds.push(first._id);

    const second = await runPublish();
    createdIds.push(second._id);

    expect(second.status).toBe("success");
    expect(second.artifacts).toHaveLength(4);
    for (const artifact of second.artifacts) {
      expect(artifact.changed).toBe(false);
    }

    const firstChecksums = new Map(first.artifacts.map((a) => [a.path, a.checksum]));
    for (const artifact of second.artifacts) {
      expect(artifact.checksum).toBe(firstChecksums.get(artifact.path));
    }
  });

  it("a failed upload records a failed publish, and a retry publishes cleanly", async () => {
    // seedStaleBaseline's completedAt is set decades in the future (needed so
    // getLatestSuccessfulPublish picks it up as the diff baseline), which
    // would also make it sort ahead of the failed record we're about to
    // create if we queried by completedAt — so the failed record is located
    // by status + a time window instead.
    await seedStaleBaseline(60);
    const beforeFailure = new Date();

    const originalBucket = process.env.S3_BUCKET;
    process.env.S3_BUCKET = "kan31-bucket-does-not-exist";
    try {
      await expect(runPublish()).rejects.toThrow();
    } finally {
      process.env.S3_BUCKET = originalBucket;
    }

    const db = await getDb();
    const failed = await db
      .collection<Publishes>("publishes")
      .findOne(
        { status: "failed", completedAt: { $gte: beforeFailure } },
        { sort: { completedAt: -1 } },
      );
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBeTruthy();
    if (failed) {
      createdIds.push(failed._id);
    }

    const retry = await runPublish();
    createdIds.push(retry._id);
    expect(retry.status).toBe("success");
    expect(retry.artifacts.every((a) => a.changed)).toBe(true);
  });
});
