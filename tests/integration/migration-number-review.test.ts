import type { Db, Document } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { listPlayersForNumberReview } from "../../lib/migration/number-review/list";
import { describeNumberReviewSaveError } from "../../app/migration-review/shirt-number/error-messages";
import { updatePlayer, DuplicateShirtNumberError } from "../../lib/repositories";

// Exercises updatePlayer() + describeNumberReviewSaveError() directly rather
// than the "use server" action itself — setPlayerNumberAction calls
// revalidatePath, which requires a real Next.js request context that only
// exists once the app is actually running (proven by
// e2e/migration-review-number.spec.ts instead).
async function saveNumber(
  playerId: string,
  number: number,
): Promise<{ error?: string }> {
  try {
    await updatePlayer(playerId, { number });
  } catch (error) {
    const message = describeNumberReviewSaveError(error);
    if (message === undefined) {
      throw error;
    }
    return { error: message };
  }
  return {};
}

describe("shirt-number migration review", () => {
  const teamId = "TM900003";

  const activeOutOfRangeId = "PLRKAN36001";
  const inactiveOutOfRangeId = "PLRKAN36002";
  const activeInRangeId = "PLRKAN36003";
  const collidingActiveId = "PLRKAN36004";
  const playerIds = [
    activeOutOfRangeId,
    inactiveOutOfRangeId,
    activeInRangeId,
    collidingActiveId,
  ];

  function col(db: Db, name: string) {
    return db.collection<Document & { _id: string }>(name);
  }

  async function insertFixtures(): Promise<void> {
    const db = await getDb();
    await col(db, "Player").insertMany([
      {
        _id: activeOutOfRangeId,
        firstName: "Active",
        surname: "OutOfRange",
        number: 134,
        positions: ["Forward"],
        active: true,
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: inactiveOutOfRangeId,
        firstName: "Inactive",
        surname: "OutOfRange",
        number: 170,
        positions: ["Defence"],
        active: false,
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: activeInRangeId,
        firstName: "Active",
        surname: "InRange",
        number: 50,
        positions: ["Goaltender"],
        active: true,
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: collidingActiveId,
        firstName: "Colliding",
        surname: "Active",
        number: 88,
        positions: ["Forward"],
        active: true,
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }

  afterEach(async () => {
    const db = await getDb();
    await col(db, "Player").deleteMany({ _id: { $in: playerIds } });
  });

  it("lists only active players with an out-of-range number", async () => {
    await insertFixtures();

    const players = await listPlayersForNumberReview();
    const ids = players.map((p) => p.playerId);

    expect(ids).toContain(activeOutOfRangeId);
    expect(ids).not.toContain(inactiveOutOfRangeId);
    expect(ids).not.toContain(activeInRangeId);
    expect(ids).not.toContain(collidingActiveId);
  });

  it("a resolved player drops off the list on the next read", async () => {
    await insertFixtures();

    const result = await saveNumber(activeOutOfRangeId, 42);
    expect(result.error).toBeUndefined();

    const players = await listPlayersForNumberReview();
    expect(players.map((p) => p.playerId)).not.toContain(activeOutOfRangeId);
  });

  it("saving into a colliding active number surfaces DuplicateShirtNumberError as a row error", async () => {
    await insertFixtures();

    const result = await saveNumber(activeOutOfRangeId, 88);

    expect(result.error).toBe(new DuplicateShirtNumberError(88).message);

    // Left unresolved — still listed with its original out-of-range number.
    const players = await listPlayersForNumberReview();
    const stillListed = players.find((p) => p.playerId === activeOutOfRangeId);
    expect(stillListed?.currentNumber).toBe(134);
  });
});
