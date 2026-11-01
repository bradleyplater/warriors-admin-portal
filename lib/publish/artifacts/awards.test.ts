import { describe, expect, it } from "vitest";
import type {
  AwardEntry,
  AwardEvening,
  Game,
  Player,
  Season,
} from "../../schemas";
import { AwardsArtifactSchema } from "../schemas";
import { generateAwardsArtifact } from "./awards";

const now = new Date();

function season(name: string): Season {
  return {
    _id: `SSN${name.replace("/", "")}`,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

function evening(
  seasonName: string,
  status: AwardEvening["status"],
  entries: AwardEntry[] = [],
): AwardEvening {
  const digits = seasonName.replace("/", "");
  return {
    _id: `EVE${digits}`,
    seasonId: `SSN${digits}`,
    status,
    entries,
    createdAt: now,
    updatedAt: now,
  };
}

const players: Player[] = [
  {
    _id: "PLR1",
    firstName: "Bradley",
    surname: "Plater",
    number: 4,
    positions: ["Forward"],
    active: true,
    teamId: "TM551420",
    createdAt: now,
    updatedAt: now,
  },
];

const games: Game[] = [
  {
    _id: "GME1",
    date: new Date("2026-01-15"),
    seasonId: "SSN2526",
    type: "BOTBC",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR1" }],
      goals: [1, 2, 3].map((minute) => ({
        _id: `GOL${minute}`,
        scoredBy: "PLR1",
        minute,
        second: 0,
        type: "EVEN",
      })),
      penalties: [],
    },
    opponentTeam: { opponentId: "OPN000001", goals: [], penalties: [] },
    createdAt: now,
    updatedAt: now,
  },
];

const seasons = [season("24/25"), season("25/26"), season("26/27")];

const mostGoals: AwardEntry = {
  _id: "AWD000001",
  category: "most-goals",
  competition: "BOTBC",
  winners: ["PLR1"],
  photo: { key: "awards/EVE2526/AWD000001/1-abc.webp" },
  note: "Club record",
};

const custom: AwardEntry = {
  _id: "AWD000002",
  customName: "Knockout of the year",
  winners: ["PLR1"],
};

function generate(evenings: AwardEvening[]) {
  return generateAwardsArtifact(evenings, seasons, players, games);
}

describe("generateAwardsArtifact", () => {
  it("publishes an announced award with its winner, total, photo and note", () => {
    const [published] = generate([
      evening("25/26", "announced", [mostGoals]),
    ]).evenings;
    expect(published?.awards).toEqual([
      {
        category: "most-goals",
        name: "Most goals",
        group: "Performance",
        competition: "BOTB",
        stat: "goals",
        winners: [{ playerId: "PLR1", total: 3 }],
        photo: {
          key: "awards/EVE2526/AWD000001/1-abc.webp",
          alt: "Bradley Plater, Most goals (BOTB), 25/26",
        },
        note: "Club record",
      },
    ]);
  });

  it("leaves totals off an award set to hide them", () => {
    const [published] = generate([
      evening("25/26", "announced", [{ ...mostGoals, hideTotal: true }]),
    ]).evenings;
    expect(published?.awards[0]?.winners).toEqual([{ playerId: "PLR1" }]);
  });

  it("leaves totals off an award set to hide them", () => {
    const [published] = generate([
      evening("25/26", "announced", [{ ...mostGoals, hideTotal: true }]),
    ]).evenings;
    expect(published?.awards[0]?.winners).toEqual([{ playerId: "PLR1" }]);
  });

  it("keeps an alt text the admin wrote", () => {
    const [published] = generate([
      evening("25/26", "announced", [
        { ...mostGoals, photo: { key: mostGoals.photo!.key, alt: "On stage" } },
      ]),
    ]).evenings;
    expect(published?.awards[0]?.photo?.alt).toBe("On stage");
  });

  it("gives away nothing about winners before they're announced", () => {
    const [published] = generate([
      evening("25/26", "categories", [mostGoals]),
    ]).evenings;
    expect(published?.status).toBe("categories");
    expect(published?.awards).toEqual([
      {
        category: "most-goals",
        name: "Most goals",
        group: "Performance",
        competition: "BOTB",
        stat: "goals",
        winners: [],
      },
    ]);
  });

  it("leaves draft evenings out", () => {
    expect(generate([evening("25/26", "draft", [mostGoals])]).evenings).toEqual(
      [],
    );
  });

  it("numbers evenings oldest first, counting drafts", () => {
    const published = generate([
      evening("26/27", "categories"),
      evening("25/26", "draft"),
      evening("24/25", "announced"),
    ]).evenings;
    expect(published.map(({ season, number }) => [season, number])).toEqual([
      ["24/25", 1],
      ["26/27", 3],
    ]);
  });

  it("files one-off awards under Club awards, club-wide", () => {
    const [published] = generate([
      evening("25/26", "announced", [custom]),
    ]).evenings;
    expect(published?.awards[0]).toEqual({
      name: "Knockout of the year",
      group: "Club awards",
      winners: [{ playerId: "PLR1" }],
    });
  });

  it("lists the competitions and the recurring awards in order", () => {
    const artifact = generate([]);
    expect(artifact.competitions).toEqual(["BOTB", "LLIHC"]);
    expect(artifact.categories[0]).toEqual({
      key: "mvp",
      name: "Most valuable player",
      group: "Most valuable player",
    });
  });

  it("validates against AwardsArtifactSchema", () => {
    const artifact = generate([
      evening("24/25", "announced", [mostGoals, custom]),
      evening("25/26", "categories", [mostGoals]),
    ]);
    expect(() => AwardsArtifactSchema.parse(artifact)).not.toThrow();
  });
});
