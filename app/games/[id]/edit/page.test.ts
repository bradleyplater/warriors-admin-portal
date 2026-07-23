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
  listSeasons: vi.fn(),
}));

import EditGamePage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditGamePage", () => {
  it("renders a 404 (calls notFound()) for an id with no matching game", async () => {
    getGameMock.mockResolvedValue(null);

    await expect(
      EditGamePage({ params: Promise.resolve({ id: "GME999999" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
