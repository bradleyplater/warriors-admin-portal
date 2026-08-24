import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import {
  createReconciliationResolution,
  listReconciliationResolutions,
} from "../../../lib/repositories";

describe("reconciliation resolutions repository", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length === 0) {
      return;
    }
    const db = await getDb();
    await db
      .collection<{ _id: string }>("reconciliationResolutions")
      .deleteMany({ _id: { $in: createdIds.splice(0) } });
  });

  it("creates and lists a resolution record", async () => {
    const created = await createReconciliationResolution({
      mismatchKey: "player-stats:PLR562272:SSN2425:gamesPlayed:teamCopy",
      dimension: "player-stats",
      entityId: "PLR562272",
      field: "gamesPlayed",
      storedValue: 9,
      computedValue: 10,
      resolvedAt: new Date("2026-08-24T00:00:00Z"),
    });
    createdIds.push(created._id);

    expect(created._id).toMatch(/^RCN\d{6}$/);

    const all = await listReconciliationResolutions();
    expect(all.some((resolution) => resolution._id === created._id)).toBe(
      true,
    );
  });
});
