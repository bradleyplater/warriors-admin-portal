import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addGamePhoto,
  addGoal,
  createGame,
  deleteGame,
  deleteGoal,
  deleteOpponentGoal,
  deleteOpponentPenalty,
  deletePenalty,
  editGoal,
  editOpponentGoal,
  editOpponentPenalty,
  editPenalty,
  getGame,
  moveGamePhoto,
  removeGamePhoto,
  updateGame,
  updateGamePhotoText,
  updateGameRoster,
  NotFoundError,
  PhotoLimitReachedError,
  PhotoNotFoundError,
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
      opponentId: "OPN000001",
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
    expect(fetched?.opponentTeam.opponentId).toBe("OPN000001");

    const updated = await updateGame(created._id, {
      opponentId: "OPN000002",
    });
    expect(updated.opponentTeam.opponentId).toBe("OPN000002");
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

  describe("editGoal", () => {
    it("updates a goal's fields in place", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }, { playerId: "PLRTEST2" }],
            goals: [
              { scoredBy: "PLRTEST1", minute: 5, second: 0, type: "EVEN" },
            ],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);
      const goalId = created.team.goals[0]._id;

      const updated = await editGoal(created._id, goalId, {
        scoredBy: "PLRTEST1",
        assist1: "PLRTEST2",
        minute: 12,
        second: 34,
        type: "PP",
      });

      expect(updated.team.goals).toHaveLength(1);
      expect(updated.team.goals[0]).toMatchObject({
        _id: goalId,
        scoredBy: "PLRTEST1",
        assist1: "PLRTEST2",
        minute: 12,
        second: 34,
        type: "PP",
      });
    });

    it("moves the goal to a different rostered scorer", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }, { playerId: "PLRTEST2" }],
            goals: [
              { scoredBy: "PLRTEST1", minute: 5, second: 0, type: "EVEN" },
            ],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);
      const goalId = created.team.goals[0]._id;

      const updated = await editGoal(created._id, goalId, {
        scoredBy: "PLRTEST2",
        minute: 5,
        second: 0,
        type: "EVEN",
      });

      expect(updated.team.goals[0].scoredBy).toBe("PLRTEST2");
    });

    it("rejects an edit that violates assist/roster rules and leaves the goal unchanged", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }, { playerId: "PLRTEST2" }],
            goals: [
              { scoredBy: "PLRTEST1", minute: 5, second: 0, type: "EVEN" },
            ],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);
      const goalId = created.team.goals[0]._id;

      await expect(
        editGoal(created._id, goalId, {
          scoredBy: "PLRTEST1",
          assist1: "PLRTEST1", // same as scorer — invalid
          minute: 5,
          second: 0,
          type: "EVEN",
        }),
      ).rejects.toThrow();

      const after = await getGame(created._id);
      expect(after?.team.goals[0].assist1).toBeUndefined();
    });

    it("throws NotFoundError for an unknown goal id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        editGoal(created._id, "GOL999999", {
          scoredBy: "PLRTEST1",
          minute: 1,
          second: 0,
          type: "EVEN",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteGoal", () => {
    it("removes the goal from the game", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }],
            goals: [
              { scoredBy: "PLRTEST1", minute: 5, second: 0, type: "EVEN" },
              { scoredBy: "PLRTEST1", minute: 10, second: 0, type: "PP" },
            ],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);
      const [firstGoalId, secondGoalId] = created.team.goals.map(
        (goal) => goal._id,
      );

      const updated = await deleteGoal(created._id, firstGoalId);
      expect(updated.team.goals.map((goal) => goal._id)).toEqual([
        secondGoalId,
      ]);
    });

    it("throws NotFoundError for an unknown goal id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        deleteGoal(created._id, "GOL999999"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("editPenalty", () => {
    it("updates a penalty's fields in place", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }],
            goals: [],
            penalties: [
              { offender: "PLRTEST1", minute: 2, second: 0, type: "TRIP", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const penaltyId = created.team.penalties[0]._id;

      const updated = await editPenalty(created._id, penaltyId, {
        offender: "PLRTEST1",
        minute: 30,
        second: 45,
        type: "SLASH",
        duration: 4,
      });

      expect(updated.team.penalties).toHaveLength(1);
      expect(updated.team.penalties[0]).toMatchObject({
        _id: penaltyId,
        offender: "PLRTEST1",
        minute: 30,
        second: 45,
        type: "SLASH",
        duration: 4,
      });
    });

    it("reassigns the offender from a player to BENCH", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }],
            goals: [],
            penalties: [
              { offender: "PLRTEST1", minute: 2, second: 0, type: "TRIP", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const penaltyId = created.team.penalties[0]._id;

      const updated = await editPenalty(created._id, penaltyId, {
        offender: "BENCH",
        minute: 2,
        second: 0,
        type: "TRIP",
        duration: 2,
      });

      expect(updated.team.penalties[0].offender).toBe("BENCH");
    });

    it("reassigns the offender from BENCH to a rostered player", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }],
            goals: [],
            penalties: [
              { offender: "BENCH", minute: 5, second: 0, type: "TOOM", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const penaltyId = created.team.penalties[0]._id;

      const updated = await editPenalty(created._id, penaltyId, {
        offender: "PLRTEST1",
        minute: 5,
        second: 0,
        type: "TOOM",
        duration: 2,
      });

      expect(updated.team.penalties[0].offender).toBe("PLRTEST1");
    });

    it("rejects an edit with an offender that is neither rostered nor BENCH", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }],
            goals: [],
            penalties: [
              { offender: "PLRTEST1", minute: 2, second: 0, type: "TRIP", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const penaltyId = created.team.penalties[0]._id;

      await expect(
        editPenalty(created._id, penaltyId, {
          offender: "PLRTEST2", // not on the roster, not BENCH
          minute: 2,
          second: 0,
          type: "TRIP",
          duration: 2,
        }),
      ).rejects.toThrow();

      const after = await getGame(created._id);
      expect(after?.team.penalties[0].offender).toBe("PLRTEST1");
    });

    it("throws NotFoundError for an unknown penalty id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        editPenalty(created._id, "PEN999999", {
          offender: "PLRTEST1",
          minute: 1,
          second: 0,
          type: "TRIP",
          duration: 2,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deletePenalty", () => {
    it("removes the penalty from the game", async () => {
      const created = await createGame(
        testGameInput({
          team: {
            id: "TM551420",
            roster: [{ playerId: "PLRTEST1" }],
            goals: [],
            penalties: [
              { offender: "PLRTEST1", minute: 2, second: 0, type: "TRIP", duration: 2 },
              { offender: "BENCH", minute: 10, second: 0, type: "TOOM", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const [firstPenaltyId, secondPenaltyId] = created.team.penalties.map(
        (penalty) => penalty._id,
      );

      const updated = await deletePenalty(created._id, firstPenaltyId);
      expect(updated.team.penalties.map((penalty) => penalty._id)).toEqual([
        secondPenaltyId,
      ]);
    });

    it("throws NotFoundError for an unknown penalty id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        deletePenalty(created._id, "PEN999999"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("editOpponentGoal", () => {
    it("updates an opponent goal's fields in place", async () => {
      const created = await createGame(
        testGameInput({
          opponentTeam: {
            opponentId: "OPN000001",
            goals: [{ scoredBy: "J. Smith", minute: 5, second: 0, type: "EVEN" }],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);
      const opponentGoalId = created.opponentTeam.goals[0]._id;

      const updated = await editOpponentGoal(created._id, opponentGoalId, {
        scoredBy: "A. Jones",
        minute: 12,
        second: 34,
        type: "PP",
      });

      expect(updated.opponentTeam.goals).toHaveLength(1);
      expect(updated.opponentTeam.goals[0]).toMatchObject({
        _id: opponentGoalId,
        scoredBy: "A. Jones",
        minute: 12,
        second: 34,
        type: "PP",
      });
    });

    it("rejects an edit that fails OpponentGoalCreateInputSchema and leaves the goal unchanged", async () => {
      const created = await createGame(
        testGameInput({
          opponentTeam: {
            opponentId: "OPN000001",
            goals: [{ scoredBy: "J. Smith", minute: 5, second: 0, type: "EVEN" }],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);
      const opponentGoalId = created.opponentTeam.goals[0]._id;

      await expect(
        editOpponentGoal(created._id, opponentGoalId, {
          scoredBy: "", // empty — invalid
          minute: 5,
          second: 0,
          type: "EVEN",
        }),
      ).rejects.toThrow();

      const after = await getGame(created._id);
      expect(after?.opponentTeam.goals[0].scoredBy).toBe("J. Smith");
    });

    it("throws NotFoundError for an unknown opponent goal id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        editOpponentGoal(created._id, "OGL999999", {
          scoredBy: "J. Smith",
          minute: 1,
          second: 0,
          type: "EVEN",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteOpponentGoal", () => {
    it("removes the opponent goal from the game", async () => {
      const created = await createGame(
        testGameInput({
          opponentTeam: {
            opponentId: "OPN000001",
            goals: [
              { scoredBy: "J. Smith", minute: 5, second: 0, type: "EVEN" },
              { scoredBy: "A. Jones", minute: 10, second: 0, type: "PP" },
            ],
            penalties: [],
          },
        }),
      );
      createdIds.push(created._id);
      const [firstGoalId, secondGoalId] = created.opponentTeam.goals.map(
        (goal) => goal._id,
      );

      const updated = await deleteOpponentGoal(created._id, firstGoalId);
      expect(updated.opponentTeam.goals.map((goal) => goal._id)).toEqual([
        secondGoalId,
      ]);
    });

    it("throws NotFoundError for an unknown opponent goal id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        deleteOpponentGoal(created._id, "OGL999999"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("editOpponentPenalty", () => {
    it("updates an opponent penalty's fields in place", async () => {
      const created = await createGame(
        testGameInput({
          opponentTeam: {
            opponentId: "OPN000001",
            goals: [],
            penalties: [
              { offender: "J. Smith", minute: 2, second: 0, type: "TRIP", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const opponentPenaltyId = created.opponentTeam.penalties[0]._id;

      const updated = await editOpponentPenalty(created._id, opponentPenaltyId, {
        offender: "A. Jones",
        minute: 30,
        second: 45,
        type: "SLASH",
        duration: 4,
      });

      expect(updated.opponentTeam.penalties).toHaveLength(1);
      expect(updated.opponentTeam.penalties[0]).toMatchObject({
        _id: opponentPenaltyId,
        offender: "A. Jones",
        minute: 30,
        second: 45,
        type: "SLASH",
        duration: 4,
      });
    });

    it("rejects an edit with a non-positive duration and leaves the penalty unchanged", async () => {
      const created = await createGame(
        testGameInput({
          opponentTeam: {
            opponentId: "OPN000001",
            goals: [],
            penalties: [
              { offender: "J. Smith", minute: 2, second: 0, type: "TRIP", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const opponentPenaltyId = created.opponentTeam.penalties[0]._id;

      await expect(
        editOpponentPenalty(created._id, opponentPenaltyId, {
          offender: "J. Smith",
          minute: 2,
          second: 0,
          type: "TRIP",
          duration: 0, // non-positive — invalid
        }),
      ).rejects.toThrow();

      const after = await getGame(created._id);
      expect(after?.opponentTeam.penalties[0].duration).toBe(2);
    });

    it("rejects an edit with an empty offender name", async () => {
      const created = await createGame(
        testGameInput({
          opponentTeam: {
            opponentId: "OPN000001",
            goals: [],
            penalties: [
              { offender: "J. Smith", minute: 2, second: 0, type: "TRIP", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const opponentPenaltyId = created.opponentTeam.penalties[0]._id;

      await expect(
        editOpponentPenalty(created._id, opponentPenaltyId, {
          offender: "", // empty — invalid
          minute: 2,
          second: 0,
          type: "TRIP",
          duration: 2,
        }),
      ).rejects.toThrow();
    });

    it("throws NotFoundError for an unknown opponent penalty id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        editOpponentPenalty(created._id, "OPP999999", {
          offender: "J. Smith",
          minute: 1,
          second: 0,
          type: "TRIP",
          duration: 2,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteOpponentPenalty", () => {
    it("removes the opponent penalty from the game", async () => {
      const created = await createGame(
        testGameInput({
          opponentTeam: {
            opponentId: "OPN000001",
            goals: [],
            penalties: [
              { offender: "J. Smith", minute: 2, second: 0, type: "TRIP", duration: 2 },
              { offender: "A. Jones", minute: 10, second: 0, type: "TOOM", duration: 2 },
            ],
          },
        }),
      );
      createdIds.push(created._id);
      const [firstPenaltyId, secondPenaltyId] = created.opponentTeam.penalties.map(
        (penalty) => penalty._id,
      );

      const updated = await deleteOpponentPenalty(created._id, firstPenaltyId);
      expect(updated.opponentTeam.penalties.map((penalty) => penalty._id)).toEqual([
        secondPenaltyId,
      ]);
    });

    it("throws NotFoundError for an unknown opponent penalty id on an existing game", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      await expect(
        deleteOpponentPenalty(created._id, "OPP999999"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateGame award fields", () => {
    it("sets and then clears an award, and the cleared game still reads back cleanly", async () => {
      const created = await createGame(testGameInput());
      createdIds.push(created._id);

      const withAward = await updateGame(created._id, {
        manOfTheMatchPlayerId: "PLRTEST1",
      });
      expect(withAward.manOfTheMatchPlayerId).toBe("PLRTEST1");

      const cleared = await updateGame(created._id, {
        manOfTheMatchPlayerId: null,
      });
      expect(cleared.manOfTheMatchPlayerId).toBeUndefined();

      // Regression check: clearing must delete the field rather than store
      // BSON null, or GameSchema's z.string().optional() throws here.
      const reread = await getGame(created._id);
      expect(reread?.manOfTheMatchPlayerId).toBeUndefined();
    });

    it("leaves an award untouched when the patch omits it", async () => {
      const created = await createGame(
        testGameInput({ netminderPlayerId: "PLRTEST1" }),
      );
      createdIds.push(created._id);

      const updated = await updateGame(created._id, {
        opponentId: "OPN000002",
      });
      expect(updated.netminderPlayerId).toBe("PLRTEST1");
    });
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
  describe("game photos", () => {
    const photoKey = (gameId: string, name: string) =>
      `games/${gameId}/photos/${name}.webp`;

    async function gameWithPhotos(count: number) {
      const game = await createGame(testGameInput());
      createdIds.push(game._id);
      for (let i = 0; i < count; i++) {
        await addGamePhoto(game._id, photoKey(game._id, `p${i}`));
      }
      return (await getGame(game._id))!;
    }

    const keysOf = (game: { photos?: { key: string }[] } | null) =>
      (game?.photos ?? []).map((photo) => photo.key.split("/").pop());

    it("adds photos to the end and advances updatedAt", async () => {
      const game = await gameWithPhotos(2);
      const updated = await addGamePhoto(game._id, photoKey(game._id, "new"));
      expect(keysOf(updated)).toEqual(["p0.webp", "p1.webp", "new.webp"]);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(game.updatedAt.getTime());
      expect(keysOf(await getGame(game._id))).toEqual(keysOf(updated));
    });

    it("allows a sixth photo but refuses a seventh, leaving the game unchanged", async () => {
      const game = await gameWithPhotos(5);
      await addGamePhoto(game._id, photoKey(game._id, "sixth"));
      await expect(
        addGamePhoto(game._id, photoKey(game._id, "seventh")),
      ).rejects.toBeInstanceOf(PhotoLimitReachedError);
      expect((await getGame(game._id))?.photos).toHaveLength(6);
    });

    it("never exceeds six photos under concurrent adds", async () => {
      const game = await gameWithPhotos(3);
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, (_, i) =>
          addGamePhoto(game._id, photoKey(game._id, `race${i}`)),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
      expect((await getGame(game._id))?.photos).toHaveLength(6);
    });

    it("throws NotFoundError when adding to a missing game", async () => {
      await expect(
        addGamePhoto("GME999999", photoKey("GME999999", "x")),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("sets trimmed alt text and caption, and clears them when blank", async () => {
      const game = await gameWithPhotos(1);
      const key = game.photos![0].key;

      const set = await updateGamePhotoText(game._id, key, {
        alt: "  Players celebrating  ",
        caption: "Goal celebration",
      });
      expect(set.photos![0]).toEqual({
        key,
        alt: "Players celebrating",
        caption: "Goal celebration",
      });

      const cleared = await updateGamePhotoText(game._id, key, {
        alt: "Players celebrating",
        caption: "   ",
      });
      expect(cleared.photos![0]).toEqual({ key, alt: "Players celebrating" });
      expect((await getGame(game._id))?.photos![0]).not.toHaveProperty("caption");
    });

    it("moves a photo earlier or later, keeping the others' order", async () => {
      const game = await gameWithPhotos(4);
      const third = game.photos![2].key;

      const earlier = await moveGamePhoto(game._id, third, "earlier");
      expect(keysOf(earlier)).toEqual(["p0.webp", "p2.webp", "p1.webp", "p3.webp"]);

      const later = await moveGamePhoto(game._id, third, "later");
      expect(keysOf(later)).toEqual(["p0.webp", "p1.webp", "p2.webp", "p3.webp"]);
    });

    it("leaves the order alone when moving past either end", async () => {
      const game = await gameWithPhotos(3);
      await moveGamePhoto(game._id, game.photos![0].key, "earlier");
      await moveGamePhoto(game._id, game.photos![2].key, "later");
      expect(keysOf(await getGame(game._id))).toEqual(["p0.webp", "p1.webp", "p2.webp"]);
    });

    it("removes a photo and advances updatedAt", async () => {
      const game = await gameWithPhotos(3);
      const removed = await removeGamePhoto(game._id, game.photos![1].key);
      expect(keysOf(removed)).toEqual(["p0.webp", "p2.webp"]);
      expect(removed.updatedAt.getTime()).toBeGreaterThanOrEqual(game.updatedAt.getTime());
    });

    it("throws PhotoNotFoundError for an unknown key", async () => {
      const game = await gameWithPhotos(1);
      const unknown = photoKey(game._id, "nope");
      await expect(updateGamePhotoText(game._id, unknown, {})).rejects.toBeInstanceOf(
        PhotoNotFoundError,
      );
      await expect(moveGamePhoto(game._id, unknown, "later")).rejects.toBeInstanceOf(
        PhotoNotFoundError,
      );
      await expect(removeGamePhoto(game._id, unknown)).rejects.toBeInstanceOf(
        PhotoNotFoundError,
      );
    });

    // Every other game write reads, parses and replaceOne()s the whole
    // document — photos must ride through that (design Risks).
    it("keeps photos through ordinary game edits", async () => {
      const game = await gameWithPhotos(2);
      await updateGame(game._id, { location: "AWAY" });
      await addGoal(game._id, {
        scoredBy: "PLRTEST1",
        minute: 3,
        second: 0,
        type: "EVEN",
      });
      expect(keysOf(await getGame(game._id))).toEqual(["p0.webp", "p1.webp"]);
    });
  });
});
