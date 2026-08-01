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
}));

import EditOpponentGoalPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditOpponentGoalPage", () => {
  it("renders a 404 (calls notFound()) for an id with no matching game", async () => {
    getGameMock.mockResolvedValue(null);

    await expect(
      EditOpponentGoalPage({
        params: Promise.resolve({ id: "GME999999", opponentGoalId: "OGL000001" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders a 404 (calls notFound()) for an opponent goal id not on the game", async () => {
    getGameMock.mockResolvedValue({
      _id: "GME000001",
      opponentTeam: { name: "Opponents", goals: [], penalties: [] },
      team: { id: "TM551420", roster: [], goals: [], penalties: [] },
    });

    await expect(
      EditOpponentGoalPage({
        params: Promise.resolve({ id: "GME000001", opponentGoalId: "OGL999999" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
