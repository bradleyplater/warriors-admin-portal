import { describe, expect, it } from "vitest";
import { computeAdditivePatch } from "./run";

describe("computeAdditivePatch", () => {
  describe("players", () => {
    it("backfills positions, teamId, number and audit timestamps from legacy fields", () => {
      const { patch, error } = computeAdditivePatch(
        {
          _id: "PLR000001",
          position: "Goalie / Defence",
          teams: [{ teamId: "TM551420", number: 22 }],
        },
        "Player",
      );

      expect(error).toBeUndefined();
      expect(patch).toMatchObject({
        positions: ["Goaltender", "Defence"],
        teamId: "TM551420",
        number: 22,
      });
      expect(patch?.createdAt).toBeInstanceOf(Date);
      expect(patch?.updatedAt).toBeInstanceOf(Date);
    });

    it("returns no patch for a player already fully migrated", () => {
      const { patch, error } = computeAdditivePatch(
        {
          _id: "PLR000002",
          positions: ["Forward"],
          teamId: "TM551420",
          number: 9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        "Player",
      );

      expect(error).toBeUndefined();
      expect(patch).toBeNull();
    });

    it("only backfills the missing fields when some are already present", () => {
      const { patch } = computeAdditivePatch(
        {
          _id: "PLR000003",
          position: "Forward",
          teams: [{ teamId: "TM551420", number: 9 }],
          positions: ["Forward"],
          createdAt: new Date(),
        },
        "Player",
      );

      expect(patch).toEqual({
        teamId: "TM551420",
        number: 9,
        updatedAt: expect.any(Date),
      });
    });

    it("errors when positions is missing and there is no legacy position string", () => {
      const { patch, error } = computeAdditivePatch(
        { _id: "PLR000004", teams: [{ teamId: "TM551420", number: 9 }] },
        "Player",
      );

      expect(patch).toBeNull();
      expect(error).toMatch(/PLR000004/);
    });

    it("errors when teamId/number is missing and there is no legacy teams entry", () => {
      const { patch, error } = computeAdditivePatch(
        { _id: "PLR000005", position: "Forward" },
        "Player",
      );

      expect(patch).toBeNull();
      expect(error).toMatch(/PLR000005/);
    });

    it("errors and applies nothing when the legacy position spelling is unmapped", () => {
      const { patch, error } = computeAdditivePatch(
        {
          _id: "PLR000006",
          position: "Wing",
          teams: [{ teamId: "TM551420", number: 9 }],
        },
        "Player",
      );

      expect(patch).toBeNull();
      expect(error).toMatch(/Unmapped legacy position spelling/);
    });
  });

  describe("games", () => {
    it("normalises lowercase type casing and backfills audit timestamps", () => {
      const { patch, error } = computeAdditivePatch(
        { _id: "GME000001", type: "challenge" },
        "Game",
      );

      expect(error).toBeUndefined();
      expect(patch).toMatchObject({ type: "CHALLENGE" });
      expect(patch?.createdAt).toBeInstanceOf(Date);
      expect(patch?.updatedAt).toBeInstanceOf(Date);
    });

    it("returns no type change when already correctly cased", () => {
      const { patch } = computeAdditivePatch(
        {
          _id: "GME000002",
          type: "CHALLENGE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        "Game",
      );

      expect(patch).toBeNull();
    });

    it("errors on a type that doesn't normalise to a valid enum value", () => {
      const { patch, error } = computeAdditivePatch(
        { _id: "GME000003", type: "friendly" },
        "Game",
      );

      expect(patch).toBeNull();
      expect(error).toMatch(/GME000003/);
    });
  });

  describe("team and seasons", () => {
    it("backfills audit timestamps for a team document", () => {
      const { patch } = computeAdditivePatch(
        { _id: "TM551420", name: "Peterborough Warriors" },
        "Team",
      );

      expect(patch?.createdAt).toBeInstanceOf(Date);
      expect(patch?.updatedAt).toBeInstanceOf(Date);
    });

    it("backfills audit timestamps for a season document", () => {
      const { patch } = computeAdditivePatch(
        { _id: "SSN2425", name: "24/25" },
        "Seasons",
      );

      expect(patch?.createdAt).toBeInstanceOf(Date);
      expect(patch?.updatedAt).toBeInstanceOf(Date);
    });

    it("returns no patch once timestamps already exist", () => {
      const { patch } = computeAdditivePatch(
        {
          _id: "SSN2425",
          name: "24/25",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        "Seasons",
      );

      expect(patch).toBeNull();
    });
  });
});
