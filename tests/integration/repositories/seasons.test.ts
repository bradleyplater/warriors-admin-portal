import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../../lib/mongodb";
import {
  createSeason,
  getSeason,
  listSeasons,
  setActiveSeason,
  DuplicateSeasonError,
  NotFoundError,
} from "../../../lib/repositories";

describe("seasons repository", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length === 0) {
      return;
    }
    const db = await getDb();
    await db
      .collection<{ _id: string }>("Seasons")
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

  describe("setActiveSeason", () => {
    // setActiveSeason touches every season, including seeded ones other
    // tests read — put the original flags back afterwards.
    let originallyActive: string[] = [];

    beforeEach(async () => {
      originallyActive = (await listSeasons())
        .filter((season) => season.active)
        .map((season) => season._id);
    });

    afterEach(async () => {
      const db = await getDb();
      const col = db.collection<{ _id: string; active?: boolean }>("Seasons");
      await col.updateMany({}, { $unset: { active: "" } });
      await col.updateMany({ _id: { $in: originallyActive } }, { $set: { active: true } });
    });

    it("moves the flag and bumps updatedAt on both changed seasons only", async () => {
      const first = await createSeason({ name: "04/05" });
      const second = await createSeason({ name: "05/06" });
      const bystander = await createSeason({ name: "06/07" });
      createdIds.push(first._id, second._id, bystander._id);

      await setActiveSeason(first._id);
      const afterFirst = await getSeason(first._id);
      expect(afterFirst?.active).toBe(true);

      await setActiveSeason(second._id);
      const [firstNow, secondNow, bystanderNow] = await Promise.all([
        getSeason(first._id),
        getSeason(second._id),
        getSeason(bystander._id),
      ]);

      expect(secondNow?.active).toBe(true);
      expect(firstNow?.active).toBeUndefined();
      expect(firstNow!.updatedAt.getTime()).toBeGreaterThanOrEqual(afterFirst!.updatedAt.getTime());
      expect(secondNow!.updatedAt.getTime()).toBeGreaterThanOrEqual(second.updatedAt.getTime());
      expect(bystanderNow?.updatedAt.getTime()).toBe(bystander.updatedAt.getTime());
      expect((await listSeasons()).filter((season) => season.active)).toHaveLength(1);
    });

    it("re-activating the active season keeps it the only active one", async () => {
      const created = await createSeason({ name: "07/08" });
      createdIds.push(created._id);

      await setActiveSeason(created._id);
      await setActiveSeason(created._id);

      const active = (await listSeasons()).filter((season) => season.active);
      expect(active.map((season) => season._id)).toEqual([created._id]);
    });

    it("rejects an unknown season and changes nothing", async () => {
      const created = await createSeason({ name: "08/09" });
      createdIds.push(created._id);
      await setActiveSeason(created._id);

      await expect(setActiveSeason("SSN9899")).rejects.toThrow(NotFoundError);
      expect((await getSeason(created._id))?.active).toBe(true);
    });
  });
});
