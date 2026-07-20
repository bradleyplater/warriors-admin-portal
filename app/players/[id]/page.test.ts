import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, getPlayerMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getPlayerMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/lib/repositories", () => ({
  getPlayer: getPlayerMock,
  listGames: vi.fn(),
  listSeasons: vi.fn(),
}));

import PlayerProfilePage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlayerProfilePage", () => {
  it("renders a 404 (calls notFound()) for an id with no matching player", async () => {
    getPlayerMock.mockResolvedValue(null);

    await expect(
      PlayerProfilePage({ params: Promise.resolve({ id: "PLR999999" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
