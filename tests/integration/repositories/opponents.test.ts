import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import {
  countGamesByOpponentId,
  createOpponent,
  deleteOpponent,
  DuplicateOpponentNameError,
  ensureIndexes,
  findOpponentByName,
  getOpponent,
  listOpponents,
  NotFoundError,
  updateOpponent,
} from "../../../lib/repositories";

const NAME_PREFIX = "Zztest Opponent";

describe("opponents repository", () => {
  const createdIds: string[] = [];

  beforeAll(async () => {
    const db = await getDb();
    await ensureIndexes(db);
    await db
      .collection("Opponent")
      .deleteMany({ name: { $regex: `^${NAME_PREFIX}`, $options: "i" } });
  });

  afterEach(async () => {
    const db = await getDb();
    await db.collection<{ _id: string }>("Game").deleteMany({ _id: { $regex: /^GME9999/ } });
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id) {
        await deleteOpponent(id).catch(() => undefined);
      }
    }
  });

  async function create(name: string) {
    const opponent = await createOpponent({ name });
    createdIds.push(opponent._id);
    return opponent;
  }

  it("creates, reads, updates, and deletes an opponent", async () => {
    const created = await create(`${NAME_PREFIX} Alpha`);
    expect(created._id).toMatch(/^OPN\d{6}$/);
    expect(created.logo).toBeUndefined();

    expect(await getOpponent(created._id)).toEqual(created);

    const updated = await updateOpponent(created._id, {
      name: `${NAME_PREFIX} Alpha Renamed`,
      logo: {
        key: `opponents/${created._id}/logo-1.png`,
        contentType: "image/png",
      },
    });
    expect(updated.name).toBe(`${NAME_PREFIX} Alpha Renamed`);
    expect(updated.logo?.contentType).toBe("image/png");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );

    await deleteOpponent(created._id);
    expect(await getOpponent(created._id)).toBeNull();
  });

  it("trims names on create", async () => {
    const created = await create(`  ${NAME_PREFIX} Trimmed  `);
    expect(created.name).toBe(`${NAME_PREFIX} Trimmed`);
  });

  it("rejects a duplicate name case-insensitively on create", async () => {
    await create(`${NAME_PREFIX} Comets`);
    await expect(
      createOpponent({ name: `${NAME_PREFIX} COMETS`.toLowerCase() }),
    ).rejects.toBeInstanceOf(DuplicateOpponentNameError);
  });

  it("rejects renaming to another opponent's name", async () => {
    await create(`${NAME_PREFIX} One`);
    const second = await create(`${NAME_PREFIX} Two`);
    await expect(
      updateOpponent(second._id, { name: `${NAME_PREFIX} ONE` }),
    ).rejects.toBeInstanceOf(DuplicateOpponentNameError);
  });

  it("allows re-saving an opponent under its own name with different case", async () => {
    const created = await create(`${NAME_PREFIX} Case`);
    const updated = await updateOpponent(created._id, {
      name: `${NAME_PREFIX} CASE`,
    });
    expect(updated.name).toBe(`${NAME_PREFIX} CASE`);
  });

  it("finds an opponent by name case-insensitively", async () => {
    const created = await create(`${NAME_PREFIX} Finder`);
    const found = await findOpponentByName(` ${NAME_PREFIX} finder `.toUpperCase());
    expect(found?._id).toBe(created._id);
  });

  it("lists opponents sorted by name, ignoring case", async () => {
    await create(`${NAME_PREFIX} b`);
    await create(`${NAME_PREFIX} A`);
    await create(`${NAME_PREFIX} C`);
    const names = (await listOpponents())
      .map((opponent) => opponent.name)
      .filter((name) => name.startsWith(NAME_PREFIX));
    expect(names).toEqual([
      `${NAME_PREFIX} A`,
      `${NAME_PREFIX} b`,
      `${NAME_PREFIX} C`,
    ]);
  });

  it("throws NotFoundError when updating or deleting an unknown id", async () => {
    await expect(
      updateOpponent("OPN999999", { name: `${NAME_PREFIX} Ghost` }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteOpponent("OPN999999")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("counts games referencing an opponent", async () => {
    const referenced = await create(`${NAME_PREFIX} Referenced`);
    const unreferenced = await create(`${NAME_PREFIX} Unreferenced`);
    const db = await getDb();
    await db.collection<{ _id: string }>("Game").insertMany(
      ["GME999901", "GME999902", "GME999903"].map((_id) => ({
        _id,
        opponentTeam: { opponentId: referenced._id, goals: [], penalties: [] },
      })),
    );

    expect(await countGamesByOpponentId(referenced._id)).toBe(3);
    expect(await countGamesByOpponentId(unreferenced._id)).toBe(0);
  });
});
