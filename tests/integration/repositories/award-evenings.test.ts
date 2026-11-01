import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import {
  addAwardEntries,
  addAwardEntry,
  createAwardEvening,
  getAwardEvening,
  getAwardEveningsLatestUpdatedAt,
  listAwardEvenings,
  moveAwardEntry,
  removeAwardEntry,
  setAwardEntryPhoto,
  setAwardEveningStatus,
  updateAwardEntry,
  DuplicateAwardEveningError,
  NotFoundError,
} from "../../../lib/repositories";

describe("award evenings repository", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length === 0) {
      return;
    }
    const db = await getDb();
    await db
      .collection<{ _id: string }>("AwardEvening")
      .deleteMany({ _id: { $in: createdIds.splice(0) } });
  });

  async function create(
    seasonId: string,
    options?: Parameters<typeof createAwardEvening>[1],
  ) {
    const created = await createAwardEvening(seasonId, options);
    createdIds.push(created._id);
    return created;
  }

  it("derives the evening id from its season and starts as an empty draft", async () => {
    const created = await create("SSN0102");

    expect(created._id).toBe("EVE0102");
    expect(created.status).toBe("draft");
    expect(created.entries).toEqual([]);
    expect(await getAwardEvening("EVE0102")).toEqual(created);
  });

  it("creates an evening with entries, each given its own id", async () => {
    const created = await create("SSN0203", {
      status: "announced",
      entries: [
        { category: "mvp", winners: ["PLR000001"] },
        { customName: "Muffin shot", winners: ["PLR000002"] },
      ],
    });

    expect(created.status).toBe("announced");
    expect(created.entries).toHaveLength(2);
    const [first, second] = created.entries;
    expect(first?._id).toMatch(/^AWD\d{6}$/);
    expect(first?._id).not.toBe(second?._id);
  });

  it("rejects a second evening for the same season", async () => {
    await create("SSN0304");

    await expect(createAwardEvening("SSN0304")).rejects.toThrow(
      DuplicateAwardEveningError,
    );
  });

  it("lists evenings oldest first", async () => {
    await create("SSN0506");
    await create("SSN0405");

    const ids = (await listAwardEvenings()).map((evening) => evening._id);
    expect(ids.indexOf("EVE0405")).toBeLessThan(ids.indexOf("EVE0506"));
  });

  it("sets the status", async () => {
    await create("SSN0607");

    const updated = await setAwardEveningStatus("EVE0607", "categories");
    expect(updated.status).toBe("categories");
    expect((await getAwardEvening("EVE0607"))?.status).toBe("categories");
  });

  it("adds entries to the end, in order", async () => {
    await create("SSN0708");

    const first = await addAwardEntry("EVE0708", {
      category: "most-goals",
      competition: "BOTBC",
      winners: [],
    });
    const second = await addAwardEntry("EVE0708", {
      category: "most-goals",
      competition: "LLIHC",
      winners: [],
    });

    const evening = await getAwardEvening("EVE0708");
    expect(evening?.entries.map((entry) => entry._id)).toEqual([
      first._id,
      second._id,
    ]);
  });

  it("updates an entry's details but keeps its photo", async () => {
    await create("SSN0809");
    const entry = await addAwardEntry("EVE0809", {
      category: "mvp",
      competition: "BOTBC",
      winners: [],
    });
    const photo = { key: `awards/EVE0809/${entry._id}/1.webp` };
    await setAwardEntryPhoto("EVE0809", entry._id, photo);

    const updated = await updateAwardEntry("EVE0809", entry._id, {
      category: "mvp",
      winners: ["PLR000001"],
    });

    expect(updated).toEqual({
      _id: entry._id,
      category: "mvp",
      winners: ["PLR000001"],
      photo,
    });
  });

  it("clears an optional field without storing null", async () => {
    await create("SSN0910");
    const entry = await addAwardEntry("EVE0910", {
      category: "captain",
      winners: ["PLR000001"],
      note: "Named for 2010/11",
    });

    await updateAwardEntry("EVE0910", entry._id, {
      category: "captain",
      winners: ["PLR000001"],
      note: undefined,
    });

    const db = await getDb();
    const raw = await db
      .collection<{ _id: string; entries: Record<string, unknown>[] }>(
        "AwardEvening",
      )
      .findOne({ _id: "EVE0910" });
    expect(raw?.entries[0]).not.toHaveProperty("note");
    // And it still reads back.
    expect(
      (await getAwardEvening("EVE0910"))?.entries[0]?.note,
    ).toBeUndefined();
  });

  it("sets and removes an entry's photo", async () => {
    await create("SSN1011");
    const entry = await addAwardEntry("EVE1011", {
      category: "mvp",
      winners: [],
    });
    const photo = { key: `awards/EVE1011/${entry._id}/1.webp`, alt: "MVP" };

    expect(
      (await setAwardEntryPhoto("EVE1011", entry._id, photo)).photo,
    ).toEqual(photo);
    expect(
      await setAwardEntryPhoto("EVE1011", entry._id, undefined),
    ).not.toHaveProperty("photo");
  });

  it("rejects a photo under another entry's prefix", async () => {
    await create("SSN1112");
    const entry = await addAwardEntry("EVE1112", {
      category: "mvp",
      winners: [],
    });

    await expect(
      setAwardEntryPhoto("EVE1112", entry._id, {
        key: "awards/EVE1112/AWD000000/1.webp",
      }),
    ).rejects.toThrow();
    expect(
      (await getAwardEvening("EVE1112"))?.entries[0]?.photo,
    ).toBeUndefined();
  });

  it("removes an entry and returns it", async () => {
    await create("SSN1213");
    const entry = await addAwardEntry("EVE1213", {
      category: "mvp",
      winners: [],
    });

    expect(await removeAwardEntry("EVE1213", entry._id)).toEqual(entry);
    expect((await getAwardEvening("EVE1213"))?.entries).toEqual([]);
  });

  it("throws NotFoundError for a missing evening or entry", async () => {
    await create("SSN1314");

    await expect(setAwardEveningStatus("EVE9998", "draft")).rejects.toThrow(
      NotFoundError,
    );
    await expect(removeAwardEntry("EVE1314", "AWD000000")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("reports the latest updatedAt across evenings", async () => {
    await create("SSN1415");
    const updated = await setAwardEveningStatus("EVE1415", "announced");

    const latest = await getAwardEveningsLatestUpdatedAt();
    expect(latest?.getTime()).toBeGreaterThanOrEqual(
      updated.updatedAt.getTime(),
    );
  });

  it("adds several entries in order in one write", async () => {
    await create("SSN1516");
    await addAwardEntry("EVE1516", { category: "captain", winners: [] });

    const evening = await addAwardEntries("EVE1516", [
      { category: "mvp", competition: "BOTBC", winners: [] },
      { category: "mvp", competition: "LLIHC", winners: [] },
    ]);

    expect(evening.entries.map((entry) => entry.competition)).toEqual([
      undefined,
      "BOTBC",
      "LLIHC",
    ]);
    expect(new Set(evening.entries.map((entry) => entry._id)).size).toBe(3);
  });

  it("moves an entry earlier or later, and does nothing at either end", async () => {
    const created = await create("SSN1617", {
      entries: [
        { category: "mvp", winners: [] },
        { category: "captain", winners: [] },
      ],
    });
    const [first, second] = created.entries.map((entry) => entry._id);

    const ids = async (direction: "earlier" | "later", id: string) =>
      (await moveAwardEntry("EVE1617", id, direction)).entries.map(
        (entry) => entry._id,
      );

    expect(await ids("later", first!)).toEqual([second, first]);
    expect(await ids("later", first!)).toEqual([second, first]);
    expect(await ids("earlier", first!)).toEqual([first, second]);
    expect(await ids("earlier", first!)).toEqual([first, second]);
  });
});
