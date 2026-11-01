import { describe, expect, it } from "vitest";
import legacyFile from "../../fixtures/golden/awards.json";
import { AwardEntrySchema } from "../schemas";
import {
  mapLegacyEvening,
  planLegacyImport,
  seasonIdFromName,
  UnmappedLegacyWinnerError,
  type LegacyAwardEvening,
} from "./legacy-import";

const legacy = legacyFile as LegacyAwardEvening[];

function evening(awards: LegacyAwardEvening["awards"]): LegacyAwardEvening {
  return { id: "awards-2425", title: "", season: "24/25", images: [], awards };
}

function award(category: string, winner: string, playerId: string | null) {
  return { tier: 2, category, winner, playerId };
}

describe("seasonIdFromName", () => {
  it("derives the season id", () => {
    expect(seasonIdFromName("22/23")).toBe("SSN2223");
  });
});

describe("mapLegacyEvening", () => {
  it("maps a recurring award to its category", () => {
    const { seasonId, entries } = mapLegacyEvening(
      evening([
        award("Most Consistent Defenceman", "Matthew Mowbray", "PLR053305"),
      ]),
    );
    expect(seasonId).toBe("SSN2425");
    expect(entries).toEqual([
      { category: "consistent-defender", winners: ["PLR053305"] },
    ]);
  });

  it("keeps a one-off award's name", () => {
    const { entries } = mapLegacyEvening(
      evening([award("Muffin Shot", "James Donovan", "PLR357060")]),
    );
    expect(entries).toEqual([
      { customName: "Muffin Shot", winners: ["PLR357060"] },
    ]);
  });

  it("notes a captaincy named for the following season", () => {
    const { entries } = mapLegacyEvening(
      evening([
        award("Captain for 2023/24 Season", "Joshua Turner", "PLR030348"),
      ]),
    );
    expect(entries).toEqual([
      {
        category: "captain",
        winners: ["PLR030348"],
        note: "Named for 2023/24",
      },
    ]);
  });

  it("merges repeated rows for the same award into one shared entry", () => {
    const { entries } = mapLegacyEvening(
      evening([
        award("Players Player", "Aaron Knight", "PLR238395"),
        award("Players Player", "Josh Jt Turner", "PLR030348"),
      ]),
    );
    expect(entries).toEqual([
      { category: "players-player", winners: ["PLR238395", "PLR030348"] },
    ]);
  });

  it("keeps alternate captains as separate entries", () => {
    const { entries } = mapLegacyEvening(
      evening([
        award("Alternate Captain", "Bradley Plater", "PLR502819"),
        award("Alternate Captain", "Matthew Mowbray", "PLR053305"),
      ]),
    );
    expect(entries).toHaveLength(2);
  });

  it("resolves winners the legacy file has no id for", () => {
    const { entries } = mapLegacyEvening(
      evening([
        award("Managers Player of the Year", "Darren Wolf", null),
        award("Most Points of the Year", "Rhys Evans & Charles Loew", null),
      ]),
    );
    expect(entries.map((entry) => entry.winners)).toEqual([
      ["PLR143854"],
      ["PLR006500", "PLR760594"],
    ]);
  });

  it("doesn't let a merge leak into the next evening's lookup", () => {
    const shared = evening([
      award("Most Points of the Year", "Rhys Evans & Charles Loew", null),
      award("Most Points of the Year", "Bradley Plater", "PLR502819"),
    ]);
    mapLegacyEvening(shared);
    const { entries } = mapLegacyEvening(
      evening([
        award("Most Points of the Year", "Rhys Evans & Charles Loew", null),
      ]),
    );
    expect(entries[0]?.winners).toEqual(["PLR006500", "PLR760594"]);
  });

  it("throws for a winner with no id and no known mapping", () => {
    expect(() =>
      mapLegacyEvening(evening([award("Captain", "Someone New", null)])),
    ).toThrow(UnmappedLegacyWinnerError);
  });

  describe("the real legacy file", () => {
    const mapped = legacy.map(mapLegacyEvening);

    it("maps every evening into valid entries", () => {
      for (const { entries } of mapped) {
        for (const entry of entries) {
          expect(
            AwardEntrySchema.safeParse({ _id: "AWD000000", ...entry }).success,
          ).toBe(true);
        }
      }
    });

    it("loses no winner", () => {
      const legacyWinners = legacy.flatMap((e) =>
        e.awards.map((a) => a.playerId ?? a.winner),
      ).length;
      const mappedWinners = mapped.flatMap((e) =>
        e.entries.flatMap((entry) => entry.winners),
      ).length;
      // The one "&" row holds two winners.
      expect(mappedWinners).toBe(legacyWinners + 1);
    });

    it("gives the 22/23 evening its shared awards", () => {
      const evening2223 = mapped.find((e) => e.seasonId === "SSN2223");
      const stickhandling = evening2223?.entries.find(
        (entry) => entry.category === "improved-stickhandling",
      );
      expect(stickhandling?.winners).toEqual(["PLR030348", "PLR006500"]);
    });
  });
});

describe("planLegacyImport", () => {
  const mapped = [
    {
      seasonId: "SSN2425",
      entries: [{ category: "mvp" as const, winners: ["PLR502819"] }],
    },
  ];
  const existing = {
    seasonIds: new Set(["SSN2425"]),
    playerIds: new Set(["PLR502819"]),
    eveningSeasonIds: new Set<string>(),
  };

  it("creates an evening whose season and winners exist", () => {
    expect(planLegacyImport(mapped, existing)).toEqual([
      { seasonId: "SSN2425", action: "create", entries: mapped[0]!.entries },
    ]);
  });

  it("skips an evening that's already been imported", () => {
    const [step] = planLegacyImport(mapped, {
      ...existing,
      eveningSeasonIds: new Set(["SSN2425"]),
    });
    expect(step).toEqual({
      seasonId: "SSN2425",
      action: "skip",
      reason: "already imported",
    });
  });

  it("skips an evening whose season doesn't exist", () => {
    const [step] = planLegacyImport(mapped, {
      ...existing,
      seasonIds: new Set<string>(),
    });
    expect(step).toMatchObject({
      action: "skip",
      reason: "season does not exist",
    });
  });

  it("skips an evening with unknown winners, naming each once", () => {
    const [step] = planLegacyImport(
      [
        {
          seasonId: "SSN2425",
          entries: [
            { category: "mvp", winners: ["PLR000001"] },
            { category: "captain", winners: ["PLR000001", "PLR502819"] },
          ],
        },
      ],
      existing,
    );
    expect(step).toMatchObject({
      action: "skip",
      reason: "unknown players: PLR000001",
    });
  });
});
