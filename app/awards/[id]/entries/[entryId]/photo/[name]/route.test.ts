import { NoSuchKey } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAwardEveningMock, readPhotoMock } = vi.hoisted(() => ({
  getAwardEveningMock: vi.fn(),
  readPhotoMock: vi.fn(),
}));

vi.mock("@/lib/repositories", () => ({ getAwardEvening: getAwardEveningMock }));
vi.mock("@/lib/game-photos", () => ({ readPhoto: readPhotoMock }));

import { GET } from "./route";

const key = "awards/EVE2526/AWD000001/1-abc.webp";

function request(name = "1-abc.webp", entryId = "AWD000001") {
  return GET(new Request("http://localhost"), {
    params: Promise.resolve({ id: "EVE2526", entryId, name }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getAwardEveningMock.mockResolvedValue({
    _id: "EVE2526",
    entries: [{ _id: "AWD000001", winners: [], photo: { key } }],
  });
});

describe("award photo route", () => {
  it("serves the award's current photo", async () => {
    readPhotoMock.mockResolvedValue(new Uint8Array([1, 2, 3]));

    const response = await request();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(readPhotoMock).toHaveBeenCalledWith(key);
  });

  it("404s for a name that isn't the award's photo", async () => {
    expect((await request("other.webp")).status).toBe(404);
    expect(readPhotoMock).not.toHaveBeenCalled();
  });

  it("404s for an award that isn't on the evening", async () => {
    expect((await request("1-abc.webp", "AWD999999")).status).toBe(404);
  });

  it("404s for a missing evening", async () => {
    getAwardEveningMock.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
  });

  it("404s when the object is gone from S3", async () => {
    readPhotoMock.mockRejectedValue(
      new NoSuchKey({ message: "gone", $metadata: {} }),
    );
    expect((await request()).status).toBe(404);
  });
});
