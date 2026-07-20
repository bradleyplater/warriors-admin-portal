import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addGoal,
  createGame,
  deleteGame,
  getGame,
  updateGame,
  updateGameRoster,
  RosterPlayerReferencedError,
} from "../../../lib/repositories";
import type { GameCreateInput } from "../../../lib/schemas";

function testGameInput(
  overrides: Partial<GameCreateInput> = {},
): GameCreateInput {
  return {
    date: new Date("2026-01-15"),
    seasonId: "SSNTEST",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLRTEST1" }, { playerId: "PLRTEST2" }],
      goals: [],
      penalties: [],
    },
    opponentTeam: {
      name: "Test Opponents",
      goals: [],
      penalties: [],
    },
    ...overrides,
  };
}

describe("games repository", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id) {
        await deleteGame(id).catch(() => undefined);
      }
    }
  });

  it("creates, reads, updates, and deletes a game, stamping audit timestamps", async () => {
    const created = await createGame(testGameInput());
    createdIds.push(created._id);

    expect(created._id).toMatch(/^GME\d{6}$/);
    expect(created.createdAt.getTime()).toBe(created.updatedAt.getTime());

    const fetched = await getGame(created._id);
    expect(fetched?.opponentTeam.name).toBe("Test Opponents");

    const updated = await updateGame(created._id, {
      opponentName: "Renamed Opponents",
    });
    expect(updated.opponentTeam.name).toBe("Renamed Opponents");
    expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());

    await deleteGame(created._id);
    createdIds.pop();
    expect(await getGame(created._id)).toBeNull();
  });

  it("assigns unique, correctly formatted ids to goals and penalties created with a game", async () => {
    const created = await createGame(
      testGameInput({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLRTEST1" }, { playerId: "PLRTEST2" }],
          goals: [
            { scoredBy: "PLRTEST1", minute: 5, second: 0, type: "EVEN" },
            { scoredBy: "PLRTEST2", minute: 10, second: 30, type: "PP" },
          ],
          penalties: [
            { offender: "PLRTEST1", minute: 2, second: 0, type: "TRIP", duration: 2 },
          ],
        },
      }),
    );
    createdIds.push(created._id);

    const goalIds = created.team.goals.map((goal) => goal._id);
    expect(new Set(goalIds).size).toBe(goalIds.length);
    goalIds.forEach((id) => expect(id).toMatch(/^GOL\d{6}$/));
    expect(created.team.penalties[0]._id).toMatch(/^PEN\d{6}$/);
  });

  it("retries embedded goal id generation on a real sibling collision, without a DB round-trip", async () => {
    const created = await createGame(
      testGameInput({
        team: {
          id: "TM551420",
          roster: [{ playerId: "PLRTEST1" }],
          goals: [{ scoredBy: "PLRTEST1", minute: 1, second: 0, type: "EVEN" }],
          penalties: [],
        },
      }),
    );
    createdIds.push(created._id);

    const existingGoalId = created.team.goals[0]._id;
    const existingDigits = Number(existingGoalId.slice(3));

    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce((existingDigits + 0.5) / 1_000_000) // reproduces the existing id -> forces a retry
      .mockReturnValueOnce(0.999999); // retried candidate

    try {
      const updated = await addGoal(created._id, {
        scoredBy: "PLRTEST1",
        minute: 2,
        second: 0,
        type: "EVEN",
      });
      const ids = updated.team.goals.map((goal) => goal._id);
      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
      expect(ids[1]).not.toBe(existingGoalId);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("allows two different games to reuse the same embedded goal id", async () => {
    const gameA = await createGame(testGameInput());
    createdIds.push(gameA._id);
    const gameB = await createGame(testGameInput());
    createdIds.push(gameB._id);

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    try {
      const updatedA = await addGoal(gameA._id, {
        scoredBy: "PLRTEST1",
        minute: 1,
        second: 0,
        type: "EVEN",
      });
      const updatedB = await addGoal(gameB._id, {
        scoredBy: "PLRTEST1",
        minute: 1,
        second: 0,
        type: "EVEN",
      });
      expect(updatedA.team.goals[0]._id).toBe(updatedB.team.goals[0]._id);
    } finally {
      randomSpy.mockRestore();
    }
  });

  describe("updateGameRoster", () => {
    it("removes an unreferenced player", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      const updated = await updateGameRoster(created._id, [
        { playerId: "PLRTEST1" },
      ]);
      expect(updated.team.roster.map((entry) => entry.playerId)).toEqual([
        "PLRTEST1",
      ]);
    });

    it("adds a new player to the roster", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      const updated = await updateGameRoster(created._id, [
        { playerId: "PLRTEST1" },
        { playerId: "PLRTEST2" },
        { playerId: "PLRTEST3" },
      ]);
      expect(
        updated.team.roster.map((entry) => entry.playerId).sort(),
      ).toEqual(["PLRTEST1", "PLRTEST2", "PLRTEST3"]);
    });

    it("blocks removal of a referenced player, leaves them on the roster, and reports what references them", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }, { playerId: "PLRTEST2" }],
            goals: [
              { scoredBy: "PLRTEST1", minute: 5, second: 0, type: "EVEN" },
              {
                scoredBy: "PLRTEST2",
                assist1: "PLRTEST1",
                minute: 10,
                second: 0,
                type: "EVEN",
              },
            ],
            penalties: [
              {
                offender: "PLRTEST1",
                minute: 2,
                second: 0,
                type: "TRIP",
                duration: 2,
              },
            ],
          },
          netminderPlayerId: "PLRTEST1",
        }),
      );
      createdIds.push(created._id);

      await expect(
        updateGameRoster(created._id, [{ playerId: "PLRTEST2" }]),
      ).rejects.toMatchObject({
        name: "RosterPlayerReferencedError",
        blocked: [
          {
            playerId: "PLRTEST1",
            goalCount: 1,
            assistCount: 1,
            penaltyCount: 1,
            isNetminder: true,
            isManOfTheMatch: false,
            isWarriorOfTheGame: false,
          },
        ],
      });

      // The player stays on the roster despite being requested for removal.
      const after = await getGame(created._id);
      expect(
        after?.team.roster.map((entry) => entry.playerId).sort(),
      ).toEqual(["PLRTEST1", "PLRTEST2"]);
    });

    it("applies a safe removal and an addition in the same call that also blocks a different removal", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [
              { playerId: "PLRTEST1" },
              { playerId: "PLRTEST2" },
              { playerId: "PLRTEST3" },
            ],
            goals: [
              { scoredBy: "PLRTEST1", minute: 5, second: 0, type: "EVEN" },
            ],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);

      let error: unknown;
      try {
        // Remove PLRTEST1 (blocked, scored a goal) and PLRTEST2 (safe),
        // keep PLRTEST3, add PLRTEST4.
        await updateGameRoster(created._id, [
          { playerId: "PLRTEST3" },
          { playerId: "PLRTEST4" },
        ]);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(RosterPlayerReferencedError);
      expect((error as RosterPlayerReferencedError).blocked).toEqual([
        expect.objectContaining({ playerId: "PLRTEST1", goalCount: 1 }),
      ]);

      const after = await getGame(created._id);
      expect(
        after?.team.roster.map((entry) => entry.playerId).sort(),
      ).toEqual(["PLRTEST1", "PLRTEST3", "PLRTEST4"]);
    });
  });
});
