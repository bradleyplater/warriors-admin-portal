import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, getAwardEveningMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getAwardEveningMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/lib/repositories", () => ({
  getAwardEvening: getAwardEveningMock,
  getSeason: vi.fn(),
  listPlayers: vi.fn(),
}));
vi.mock("./actions", () => ({}));

import AwardEveningPage from "./[id]/page";
import NewAwardEntryPage from "./[id]/entries/new/page";
import EditAwardEntryPage from "./[id]/entries/[entryId]/page";

const evening = {
  _id: "EVE2526",
  seasonId: "SSN2526",
  status: "draft",
  entries: [{ _id: "AWD000001", category: "mvp", winners: [] }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("award pages", () => {
  it("evening page 404s for an unknown evening", async () => {
    getAwardEveningMock.mockResolvedValue(null);
    await expect(
      AwardEveningPage({ params: Promise.resolve({ id: "EVE9999" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("add-award page 404s for an unknown evening", async () => {
    getAwardEveningMock.mockResolvedValue(null);
    await expect(
      NewAwardEntryPage({ params: Promise.resolve({ id: "EVE9999" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("edit-award page 404s for an unknown evening", async () => {
    getAwardEveningMock.mockResolvedValue(null);
    await expect(
      EditAwardEntryPage({
        params: Promise.resolve({ id: "EVE9999", entryId: "AWD000001" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("edit-award page 404s for an award not on the evening", async () => {
    getAwardEveningMock.mockResolvedValue(evening);
    await expect(
      EditAwardEntryPage({
        params: Promise.resolve({ id: "EVE2526", entryId: "AWD999999" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
