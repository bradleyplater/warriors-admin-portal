import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, getGameMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getGameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/lib/repositories", () => ({
  getGame: getGameMock,
  listPlayers: vi.fn(),
}));

import EditGoalPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditGoalPage", () => {
  it("renders a 404 (calls notFound()) for an id with no matching game", async () => {
    getGameMock.mockResolvedValue(null);

    await expect(
      EditGoalPage({
        params: Promise.resolve({ id: "GME999999", goalId: "GOL000001" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders a 404 (calls notFound()) for a goal id not on the game", async () => {
    getGameMock.mockResolvedValue({
      _id: "GME000001",
      opponentTeam: { name: "Opponents", goals: [], penalties: [] },
      team: { id: "TM551420", roster: [], goals: [], penalties: [] },
    });

    await expect(
      EditGoalPage({
        params: Promise.resolve({ id: "GME000001", goalId: "GOL999999" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
