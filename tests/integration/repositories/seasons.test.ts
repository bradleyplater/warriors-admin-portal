import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import {
  createSeason,
  getSeason,
  listSeasons,
  DuplicateSeasonError,
} from "../../../lib/repositories";

describe("seasons repository", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length === 0) {
      return;
    }
    const db = await getDb();
    await db
      .collection<{ _id: string }>("seasons")
      .deleteMany({ _id: { $in: createdIds.splice(0) } });
  });

  it("derives the season id from its name", async () => {
    const created = await createSeason({ name: "01/02" });
    createdIds.push(created._id);

    expect(created._id).toBe("SSN0102");
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it("reads and lists seasons", async () => {
    const created = await createSeason({ name: "02/03" });
    createdIds.push(created._id);

    const fetched = await getSeason(created._id);
    expect(fetched?._id).toBe(created._id);

    const all = await listSeasons();
    expect(all.some((season) => season._id === created._id)).toBe(true);
  });

  it("rejects creating a season whose derived id already exists, without retrying", async () => {
    const created = await createSeason({ name: "03/04" });
    createdIds.push(created._id);

    await expect(createSeason({ name: "03/04" })).rejects.toThrow(
      DuplicateSeasonError,
    );
  });
});
