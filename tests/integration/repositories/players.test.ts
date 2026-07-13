import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../../lib/mongodb";

interface RawDoc {
  _id: string;
  [key: string]: unknown;
}
import {
  createPlayer,
  deletePlayer,
  ensureIndexes,
  getPlayer,
  updatePlayer,
  DuplicateShirtNumberError,
} from "../../../lib/repositories";
import type { PlayerCreateInput } from "../../../lib/schemas";

const TEST_TEAM_ID = "TM551420";

function testPlayerInput(
  overrides: Partial<PlayerCreateInput> = {},
): PlayerCreateInput {
  return {
    firstName: "Zztest",
    surname: "Player",
    number: 88,
    positions: ["Forward"],
    active: true,
    teamId: TEST_TEAM_ID,
    ...overrides,
  };
}

describe("players repository", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id) {
        await deletePlayer(id).catch(() => undefined);
      }
    }
  });

  it("creates, reads, updates, and deletes a player, stamping audit timestamps", async () => {
    const created = await createPlayer(testPlayerInput());
    createdIds.push(created._id);

    expect(created._id).toMatch(/^PLR\d{6}$/);
    expect(created.createdAt.getTime()).toBe(created.updatedAt.getTime());

    const fetched = await getPlayer(created._id);
    expect(fetched?.firstName).toBe("Zztest");

    const updated = await updatePlayer(created._id, { firstName: "Updated" });
    expect(updated.firstName).toBe("Updated");
    expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );

    await deletePlayer(created._id);
    createdIds.pop();
    expect(await getPlayer(created._id)).toBeNull();
  });

  it("rejects a second active player with the same number (DB-level constraint)", async () => {
    await ensureIndexes(await getDb());

    const first = await createPlayer(testPlayerInput({ number: 89 }));
    createdIds.push(first._id);

    await expect(
      createPlayer(testPlayerInput({ number: 89, surname: "Second" })),
    ).rejects.toThrow(DuplicateShirtNumberError);
  });

  it("allows the same number across an active and an inactive player", async () => {
    await ensureIndexes(await getDb());

    const active = await createPlayer(testPlayerInput({ number: 90 }));
    createdIds.push(active._id);

    const inactive = await createPlayer(
      testPlayerInput({ number: 90, active: false, surname: "Inactive" }),
    );
    createdIds.push(inactive._id);

    expect(inactive._id).not.toBe(active._id);
  });

  it("retries id generation against a real MongoDB duplicate _id error", async () => {
    const db = await getDb();
    const collidingId = "PLR000123";
    await db.collection<RawDoc>("players").insertOne({
      _id: collidingId,
      ...testPlayerInput({ number: 92 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdIds.push(collidingId);

    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.000123) // -> "000123": collides with the pre-inserted id
      .mockReturnValue(0.5); // retried candidate

    try {
      const created = await createPlayer(testPlayerInput({ number: 93 }));
      createdIds.push(created._id);
      expect(created._id).not.toBe(collidingId);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
