import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import {
  countUpcomingGamesByOpponentId,
  createUpcomingGame,
  deleteUpcomingGame,
  ensureIndexes,
  getUpcomingGame,
  getUpcomingGamesLatestUpdatedAt,
  listUpcomingGames,
  NotFoundError,
  updateUpcomingGame,
} from "../../../lib/repositories";
import type { UpcomingGameCreateInput } from "../../../lib/schemas";

// Opponent ids no seeded or real opponent uses — the repository doesn't
// check the reference exists (that's the server action's job), so these
// keep the tests isolated from seed data.
const OPPONENT_A = "OPN999901";
const OPPONENT_B = "OPN999902";

function input(overrides: Partial<UpcomingGameCreateInput> = {}): UpcomingGameCreateInput {
  return {
    opponentId: OPPONENT_A,
    date: "2099-10-03",
    time: "20:30",
    location: "HOME",
    type: "CHALLENGE",
    ...overrides,
  } as UpcomingGameCreateInput;
}

describe("upcoming-games repository", () => {
  const createdIds: string[] = [];

  async function create(overrides: Partial<UpcomingGameCreateInput> = {}) {
    const game = await createUpcomingGame(input(overrides));
    createdIds.push(game._id);
    return game;
  }

  beforeAll(async () => {
    const db = await getDb();
    await ensureIndexes(db);
    await db
      .collection("UpcomingGame")
      .deleteMany({ opponentId: { $in: [OPPONENT_A, OPPONENT_B] } });
  });

  afterEach(async () => {
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id) {
        await deleteUpcomingGame(id).catch(() => undefined);
      }
    }
  });

  it("creates, reads, and deletes an upcoming game", async () => {
    const created = await create();
    expect(created._id).toMatch(/^UPG\d{6}$/);
    expect(await getUpcomingGame(created._id)).toEqual(created);

    await deleteUpcomingGame(created._id);
    expect(await getUpcomingGame(created._id)).toBeNull();
  });

  it("lists games soonest first by date then time", async () => {
    const late = await create({ date: "2099-10-04", time: "19:00" });
    const evening = await create({ date: "2099-10-03", time: "20:30" });
    const afternoon = await create({ date: "2099-10-03", time: "16:00" });

    const ids = (await listUpcomingGames())
      .map((game) => game._id)
      .filter((id) => [late._id, evening._id, afternoon._id].includes(id));
    expect(ids).toEqual([afternoon._id, evening._id, late._id]);
  });

  it("drops the venue when an away game is changed to home", async () => {
    const away = await create({ location: "AWAY", venue: "Riverside Leisure Centre" });

    const updated = await updateUpcomingGame(away._id, input({ location: "HOME" }));
    expect(updated.venue).toBeUndefined();
    expect(updated.createdAt).toEqual(away.createdAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(away.updatedAt.getTime());

    const stored = await getUpcomingGame(away._id);
    expect(stored).not.toHaveProperty("venue");
  });

  it("raises NotFoundError for an unknown id", async () => {
    await expect(updateUpcomingGame("UPG000000", input())).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteUpcomingGame("UPG000000")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("counts games by opponent", async () => {
    await create({ opponentId: OPPONENT_A });
    await create({ opponentId: OPPONENT_A, date: "2099-11-01" });

    expect(await countUpcomingGamesByOpponentId(OPPONENT_A)).toBe(2);
    expect(await countUpcomingGamesByOpponentId(OPPONENT_B)).toBe(0);
  });

  it("reports the latest updatedAt", async () => {
    const created = await create();
    const latest = await getUpcomingGamesLatestUpdatedAt();
    expect(latest?.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });
});
