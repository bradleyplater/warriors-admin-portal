import { describe, expect, it } from "vitest";
import { generateUpcomingGamesArtifact, HOME_VENUE } from "./upcoming-games";
import { UpcomingGamesArtifactSchema } from "../schemas";
import type { Opponent, UpcomingGame } from "../../schemas";

const chelmsford: Opponent = {
  _id: "OPN000001",
  name: "Chelmsford Chargers",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const logoed: Opponent = {
  _id: "OPN123456",
  name: "Sheffield Mavericks",
  logo: { key: "opponents/OPN123456/logo-1.png", contentType: "image/png" },
  createdAt: new Date(),
  updatedAt: new Date(),
};
const opponents = [chelmsford, logoed];

const TODAY = "2026-10-01";

function game(overrides: Partial<UpcomingGame> = {}): UpcomingGame {
  return {
    _id: "UPG000001",
    opponentId: chelmsford._id,
    date: "2026-10-03",
    time: "20:30",
    location: "HOME",
    type: "CHALLENGE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UpcomingGame;
}

describe("generateUpcomingGamesArtifact", () => {
  it("emits an away game in the legacy shape", () => {
    const artifact = generateUpcomingGamesArtifact(
      [game({ location: "AWAY", venue: "Riverside Leisure Centre" })],
      opponents,
      TODAY,
    );

    expect(artifact).toEqual([
      {
        opponentTeam: "Chelmsford Chargers",
        logoImage: "",
        gameType: "Challenge",
        date: "2026-10-03",
        time: "8:30 PM",
        location: "Riverside Leisure Centre",
      },
    ]);
    expect(() => UpcomingGamesArtifactSchema.parse(artifact)).not.toThrow();
  });

  it("uses the home rink and the opponent's logo key for a home game", () => {
    const [entry] = generateUpcomingGamesArtifact(
      [game({ opponentId: logoed._id, type: "LLIHC", time: "16:00" })],
      opponents,
      TODAY,
    );

    expect(entry).toMatchObject({
      logoImage: "opponents/OPN123456/logo-1.png",
      gameType: "LLIHC",
      time: "4:00 PM",
      location: HOME_VENUE,
    });
    expect(HOME_VENUE).toBe("Planet Ice Peterborough");
  });

  it("excludes games dated before today and keeps today's", () => {
    const artifact = generateUpcomingGamesArtifact(
      [
        game({ _id: "UPG000001", date: "2026-09-30" }),
        game({ _id: "UPG000002", date: "2026-10-01" }),
      ],
      opponents,
      TODAY,
    );

    expect(artifact.map((entry) => entry.date)).toEqual(["2026-10-01"]);
  });

  it("sorts by date then time regardless of input order", () => {
    const artifact = generateUpcomingGamesArtifact(
      [
        game({ _id: "UPG000001", date: "2026-10-10", time: "19:00" }),
        game({ _id: "UPG000002", date: "2026-10-03", time: "20:30" }),
        game({ _id: "UPG000003", date: "2026-10-03", time: "16:00" }),
      ],
      opponents,
      TODAY,
    );

    expect(artifact.map((entry) => `${entry.date} ${entry.time}`)).toEqual([
      "2026-10-03 4:00 PM",
      "2026-10-03 8:30 PM",
      "2026-10-10 7:00 PM",
    ]);
  });

  it("throws, naming the game, when the opponent is missing", () => {
    expect(() =>
      generateUpcomingGamesArtifact(
        [game({ _id: "UPG000009", opponentId: "OPN999999" })],
        opponents,
        TODAY,
      ),
    ).toThrow(/UPG000009/);
  });

  it("does not fail on a dangling reference in a past game it would exclude anyway", () => {
    expect(
      generateUpcomingGamesArtifact(
        [game({ date: "2026-01-01", opponentId: "OPN999999" })],
        opponents,
        TODAY,
      ),
    ).toEqual([]);
  });
});
