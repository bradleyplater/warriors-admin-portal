import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import { createPublish, getPublish, listPublishes } from "../../../lib/repositories";

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
});
