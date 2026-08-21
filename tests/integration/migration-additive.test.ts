import type { Db, Document } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { runAdditiveMigration } from "../../lib/migration/additive/run";

// Runs the real additive migration against the local Docker Mongo (see
// docs/06-local-development.md) — no mocking, matching this repo's existing
// integration-test convention for infra with a local equivalent. Fixtures
// are inserted directly (bypassing the seed module) since they represent a
// genuinely pre-migration production shape that no dev/e2e flow should ever
// see once migrated — the shared seed module stays target-shape-primary.
describe("runAdditiveMigration", () => {
  const TEAM_ID = "TM900001";
  const teamDocId = "TMKAN34001";
  const seasonId = "SSNKAN34";
  const gameIds = ["GMEKAN34001", "GMEKAN34002"];

  // One player per documented legacy position spelling
  // (docs/04-migration-plan.md), each with only the legacy `position` /
  // `teams` fields — no target-shape fields, no audit timestamps.
  const LEGACY_SPELLINGS: Array<{ position: string; expected: string[] }> = [
    { position: "Forward", expected: ["Forward"] },
    { position: "Defence", expected: ["Defence"] },
    { position: "Goaltender", expected: ["Goaltender"] },
    { position: "Forward / Defence", expected: ["Forward", "Defence"] },
    { position: "Defence / Forward", expected: ["Defence", "Forward"] },
    {
      position: "Defence / Goaltender",
      expected: ["Defence", "Goaltender"],
    },
    { position: "Defence/Goaltender", expected: ["Defence", "Goaltender"] },
    { position: "Goalie / Defence", expected: ["Goaltender", "Defence"] },
  ];

  const legacyPlayers = LEGACY_SPELLINGS.map(({ position, expected }, index) => ({
    _id: `PLRKAN34${String(index).padStart(3, "0")}`,
    firstName: "Legacy",
    surname: `Player${index}`,
    position,
    teams: [{ teamId: TEAM_ID, number: index + 1 }],
    expectedPositions: expected,
  }));
  const playerIds = legacyPlayers.map((p) => p._id);

  function col(db: Db, name: string) {
    return db.collection<Document & { _id: string }>(name);
  }

  async function insertFixtures(): Promise<void> {
    const db = await getDb();
    await col(db, "Player").insertMany(
      legacyPlayers.map((player) => ({
        _id: player._id,
        firstName: player.firstName,
        surname: player.surname,
        position: player.position,
        teams: player.teams,
      })),
    );
    await col(db, "Game").insertMany([
      { _id: gameIds[0], seasonId, type: "challenge" },
      { _id: gameIds[1], seasonId, type: "BOTBC" },
    ]);
    await col(db, "Team").insertOne({
      _id: teamDocId,
      name: "Legacy Fixture Team",
    });
    await col(db, "Seasons").insertOne({ _id: seasonId, name: "KA/N3" });
  }

  afterEach(async () => {
    const db = await getDb();
    await Promise.all([
      col(db, "Player").deleteMany({ _id: { $in: playerIds } }),
      col(db, "Game").deleteMany({ _id: { $in: gameIds } }),
      col(db, "Team").deleteOne({ _id: teamDocId }),
      col(db, "Seasons").deleteOne({ _id: seasonId }),
    ]);
  });

  it("dry-run reports every intended change and writes nothing", async () => {
    await insertFixtures();

    const summary = await runAdditiveMigration({ dryRun: true });

    const players = summary.collections.find((c) => c.name === "Player")!;
    for (const player of legacyPlayers) {
      const change = players.changes.find((c) => c.id === player._id);
      expect(change).toBeDefined();
      expect(change!.patch).toMatchObject({
        positions: player.expectedPositions,
        teamId: TEAM_ID,
        number: expect.any(Number),
      });
    }

    const games = summary.collections.find((c) => c.name === "Game")!;
    const challengeChange = games.changes.find((c) => c.id === gameIds[0]);
    expect(challengeChange?.patch).toMatchObject({ type: "CHALLENGE" });

    const db = await getDb();
    const untouched = await col(db, "Player").findOne({
      _id: playerIds[0],
    });
    expect(untouched?.positions).toBeUndefined();
    expect(untouched?.createdAt).toBeUndefined();
  });

  it("applies the additive changes without touching legacy fields", async () => {
    await insertFixtures();

    await runAdditiveMigration({ dryRun: false });

    const db = await getDb();
    for (const player of legacyPlayers) {
      const doc = await col(db, "Player").findOne({ _id: player._id });
      expect(doc?.positions).toEqual(player.expectedPositions);
      expect(doc?.teamId).toBe(TEAM_ID);
      expect(typeof doc?.number).toBe("number");
      expect(doc?.createdAt).toBeInstanceOf(Date);
      expect(doc?.updatedAt).toBeInstanceOf(Date);
      // Legacy fields remain untouched.
      expect(doc?.position).toBe(player.position);
      expect(doc?.teams).toEqual(player.teams);
    }

    const challengeGame = await col(db, "Game").findOne({ _id: gameIds[0] });
    expect(challengeGame?.type).toBe("CHALLENGE");
    expect(challengeGame?.createdAt).toBeInstanceOf(Date);

    const alreadyCasedGame = await col(db, "Game").findOne({
      _id: gameIds[1],
    });
    expect(alreadyCasedGame?.type).toBe("BOTBC");

    const team = await col(db, "Team").findOne({ _id: teamDocId });
    expect(team?.createdAt).toBeInstanceOf(Date);
    expect(team?.updatedAt).toBeInstanceOf(Date);

    const season = await col(db, "Seasons").findOne({ _id: seasonId });
    expect(season?.createdAt).toBeInstanceOf(Date);
    expect(season?.updatedAt).toBeInstanceOf(Date);
  });

  it("running the migration twice produces zero changes the second time", async () => {
    await insertFixtures();

    const first = await runAdditiveMigration({ dryRun: false });
    const firstChangedTotal = first.collections.reduce(
      (sum, c) => sum + c.changedCount,
      0,
    );
    expect(firstChangedTotal).toBeGreaterThan(0);

    const db = await getDb();
    const afterFirstRun = await col(db, "Player").findOne({
      _id: playerIds[0],
    });

    const second = await runAdditiveMigration({ dryRun: false });
    const secondChangedTotal = second.collections.reduce(
      (sum, c) => sum + c.changedCount,
      0,
    );
    expect(secondChangedTotal).toBe(0);
    for (const collection of second.collections) {
      expect(collection.errors).toHaveLength(0);
    }

    const afterSecondRun = await col(db, "Player").findOne({
      _id: playerIds[0],
    });
    // createdAt must not have been re-stamped on the second run.
    expect(afterSecondRun?.createdAt).toEqual(afterFirstRun?.createdAt);
  });
});
