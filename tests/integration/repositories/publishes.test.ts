import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import {
  createPublish,
  getPublish,
  listPublishes,
  getLatestSuccessfulPublish,
} from "../../../lib/repositories";

describe("publishes repository", () => {
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

  it("creates and reads a publish record", async () => {
    const created = await createPublish({
      startedAt: new Date("2026-01-01T00:00:00Z"),
      completedAt: new Date("2026-01-01T00:05:00Z"),
      artifacts: [{ path: "players.json", checksum: "abc123", changed: true }],
      status: "success",
    });
    createdIds.push(created._id);

    expect(created._id).toMatch(/^PUB\d{6}$/);

    const fetched = await getPublish(created._id);
    expect(fetched?.status).toBe("success");

    const all = await listPublishes();
    expect(all.some((publish) => publish._id === created._id)).toBe(true);
  });

  it("getLatestSuccessfulPublish returns the newest success, ignoring a newer failure", async () => {
    // Dates set far in the future so this pair is unambiguously the newest
    // in the collection, regardless of real publish records already present
    // in the shared dev database.
    const farFuture = Date.now() + 1000 * 60 * 60 * 24 * 365 * 50;

    const success = await createPublish({
      startedAt: new Date(farFuture),
      completedAt: new Date(farFuture + 5_000),
      artifacts: [{ path: "players.json", checksum: "abc123", changed: true }],
      status: "success",
    });
    createdIds.push(success._id);

    const failure = await createPublish({
      startedAt: new Date(farFuture + 10_000),
      completedAt: new Date(farFuture + 15_000),
      artifacts: [],
      status: "failed",
      error: "S3 bucket not found",
    });
    createdIds.push(failure._id);

    const latest = await getLatestSuccessfulPublish();
    expect(latest?._id).toBe(success._id);
  });
});
