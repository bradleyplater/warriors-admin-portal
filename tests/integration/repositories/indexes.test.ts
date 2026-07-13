import { describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import { ensureIndexes } from "../../../lib/repositories";

describe("ensureIndexes", () => {
  it("creates the partial unique index on players.number", async () => {
    const db = await getDb();
    await ensureIndexes(db);

    const indexes = await db.collection("players").indexes();
    const numberIndex = indexes.find((index) => index.key?.number === 1);
    expect(numberIndex?.unique).toBe(true);
    expect(numberIndex?.partialFilterExpression).toEqual({ active: true });
  });

  it("is idempotent — calling it twice does not error or duplicate indexes", async () => {
    const db = await getDb();
    await ensureIndexes(db);
    const before = await db.collection("players").indexes();

    await expect(ensureIndexes(db)).resolves.toBeUndefined();

    const after = await db.collection("players").indexes();
    expect(after.length).toBe(before.length);
  });

  it("still exists after the seed pipeline runs a second time and skips fixture insertion", async () => {
    const { runSeed } = await import("../../../seed/run");
    await runSeed();
    await runSeed();

    const db = await getDb();
    const indexes = await db.collection("players").indexes();
    const numberIndex = indexes.find((index) => index.key?.number === 1);
    expect(numberIndex?.unique).toBe(true);
  });
});
