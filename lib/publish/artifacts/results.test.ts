import { describe, expect, it } from "vitest";
import { generateResultsArtifact } from "./results";
import { ResultsArtifactSchema } from "../schemas";
import type { Game, Opponent, Season } from "../../schemas";
import { serializeArtifact } from "../generate";
import { checksumContent } from "../checksum";

const seasons: Season[] = [
  { _id: "SSN2425", name: "24/25", createdAt: new Date(), updatedAt: new Date() },
];

const rivals: Opponent = {
  _id: "OPN000001",
  name: "Rivals HC",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const logoed: Opponent = {
  _id: "OPN000002",
  name: "Cleveland Comets",
  logo: { key: "opponents/OPN000002/logo-1.svg", contentType: "image/svg+xml" },
  createdAt: new Date(),
  updatedAt: new Date(),
};
const opponents = [rivals, logoed];

function game(overrides: Partial<Game> = {}): Game {
  return {
    _id: "GME1",
    date: new Date("2025-01-15T19:00:00.000Z"),
    seasonId: "SSN2425",
    type: "CHALLENGE",
    location: "HOME",
    team: {
      id: "TM551420",
      roster: [{ playerId: "PLR1" }, { playerId: "PLR2" }],
      goals: [],
      penalties: [],
    },
    opponentTeam: { opponentId: "OPN000001", goals: [], penalties: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("generateResultsArtifact", () => {
  it("validates against ResultsArtifactSchema", () => {
    const artifact = generateResultsArtifact([game()], seasons, opponents);
    expect(() => ResultsArtifactSchema.parse(artifact)).not.toThrow();
  });

  it("resolves both season and seasonId to the season's name, not the SSN#### id", () => {
    const [entry] = generateResultsArtifact([game()], seasons, opponents);
    expect(entry.season).toBe("24/25");
    expect(entry.seasonId).toBe("24/25");
  });

  it("flattens the roster to an array of player ids", () => {
    const [entry] = generateResultsArtifact([game()], seasons, opponents);
    expect(entry.roster).toEqual(["PLR1", "PLR2"]);
  });

  it('defaults unset award/netminder fields to the "MISSING" sentinel', () => {
    const [entry] = generateResultsArtifact([game()], seasons, opponents);
    expect(entry.manOfTheMatchPlayerId).toBe("MISSING");
    expect(entry.warriorOfTheGamePlayerId).toBe("MISSING");
    expect(entry.netminderPlayerId).toBe("MISSING");
  });

  it("passes through a set award/netminder field instead of the sentinel", () => {
    const [entry] = generateResultsArtifact(
      [game({ netminderPlayerId: "PLR1" })],
      seasons,
      opponents,
    );
    expect(entry.netminderPlayerId).toBe("PLR1");
  });

  it('renders GameType "CHALLENGE" as "Challenge" and passes other types through unchanged', () => {
    const [challenge, llihc] = generateResultsArtifact(
      [game({ _id: "GME1", type: "CHALLENGE" }), game({ _id: "GME2", type: "LLIHC" })],
      seasons,
      opponents,
    );
    expect(challenge.competition).toBe("Challenge");
    expect(llihc.competition).toBe("LLIHC");
  });

  it("emits the opponent's current name and omits logoImage when it has no logo", () => {
    const [entry] = generateResultsArtifact([game()], seasons, opponents);
    expect(entry.opponentTeam).toBe("Rivals HC");
    expect("logoImage" in entry).toBe(false);
  });

  it("emits the opponent's logo key as logoImage, straight after opponentTeam", () => {
    const [entry] = generateResultsArtifact(
      [game({ opponentTeam: { opponentId: "OPN000002", goals: [], penalties: [] } })],
      seasons,
      opponents,
    );
    expect(entry.opponentTeam).toBe("Cleveland Comets");
    expect(entry.logoImage).toBe("opponents/OPN000002/logo-1.svg");
    expect(Object.keys(entry).slice(0, 3)).toEqual(["season", "opponentTeam", "logoImage"]);
  });

  it("changes the serialized checksum when an opponent is renamed", () => {
    const before = generateResultsArtifact([game()], seasons, opponents);
    const after = generateResultsArtifact([game()], seasons, [
      { ...rivals, name: "Rivals Ice Hockey Club" },
      logoed,
    ]);
    expect(checksumContent(serializeArtifact(after))).not.toBe(
      checksumContent(serializeArtifact(before)),
    );
  });

  it("throws, naming the game, when a game references a missing opponent", () => {
    expect(() =>
      generateResultsArtifact(
        [game({ _id: "GME42", opponentTeam: { opponentId: "OPN999999", goals: [], penalties: [] } })],
        seasons,
        opponents,
      ),
    ).toThrow("Game GME42 references opponent OPN999999, which does not exist");
  });

  it("sorts games by date ascending", () => {
    const games = [
      game({ _id: "GME1", date: new Date("2025-03-01") }),
      game({ _id: "GME2", date: new Date("2025-01-01") }),
    ];
    const artifact = generateResultsArtifact(games, seasons, opponents);
    expect(artifact.map((entry) => entry.date)).toEqual([
      new Date("2025-01-01").toISOString(),
      new Date("2025-03-01").toISOString(),
    ]);
  });
  describe("photos", () => {
    const key = (name: string) => `games/GME1/photos/${name}.webp`;

    it("emits photos in order, generating alt text the admin left blank", () => {
      const [entry] = generateResultsArtifact(
        [
          game({
            date: new Date("2026-10-12T18:30:00.000Z"),
            opponentTeam: { opponentId: "OPN000002", goals: [], penalties: [] },
            photos: [
              { key: key("a"), alt: "Players celebrating", caption: "Goal celebration" },
              { key: key("b") },
            ],
          }),
        ],
        seasons,
        opponents,
      );
      expect(entry.photos).toEqual([
        { key: key("a"), alt: "Players celebrating", caption: "Goal celebration" },
        {
          key: key("b"),
          alt: "Photo 2 of 2 from Warriors v Cleveland Comets, 12 Oct 2026",
        },
      ]);
      expect(entry.photos?.[1]).not.toHaveProperty("caption");
      expect(() => ResultsArtifactSchema.parse([entry])).not.toThrow();
    });

    it("dates the generated alt text on the London calendar", () => {
      // 00:30 BST on 1 Sep is still 31 Aug in UTC.
      const [entry] = generateResultsArtifact(
        [game({ date: new Date("2026-08-31T23:30:00.000Z"), photos: [{ key: key("a") }] })],
        seasons,
        opponents,
      );
      expect(entry.photos?.[0].alt).toBe("Photo 1 of 1 from Warriors v Rivals HC, 1 Sep 2026");
    });

    it("omits photos entirely when a game has none", () => {
      const [withoutField] = generateResultsArtifact([game()], seasons, opponents);
      const [emptyArray] = generateResultsArtifact([game({ photos: [] })], seasons, opponents);
      expect(withoutField).not.toHaveProperty("photos");
      expect(emptyArray).not.toHaveProperty("photos");
      expect(serializeArtifact([emptyArray])).toBe(serializeArtifact([withoutField]));
    });
  });
});
