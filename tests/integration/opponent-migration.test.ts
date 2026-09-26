import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { deleteOpponent, ensureIndexes, findOpponentByName } from "../../lib/repositories";
import { runOpponentMigration } from "../../lib/migration/opponents/run";

// Runs against the shared local database, so it only ever touches its own
// legacy-shaped games (GME9997xx) and "Zztest Mig" opponents — seeded games
// already reference opponents and are ignored by the migration.
const GAME_PREFIX = "GME9997";

interface LegacyGame {
  _id: string;
  [key: string]: unknown;
}

function legacyGame(_id: string, opponentName: string): LegacyGame {
  const now = new Date();
  return {
    _id,
    date: new Date("2020-01-01"),
    seasonId: "SSN2324",
    type: "CHALLENGE",
    location: "HOME",
    team: { id: "TM551420", roster: [], goals: [], penalties: [] },
    opponentTeam: { name: opponentName, goals: [], penalties: [] },
    createdAt: now,
    updatedAt: now,
  };
}

async function games() {
  return (await getDb()).collection<LegacyGame>("Game");
}

async function cleanUp() {
  const db = await getDb();
  await db.collection<LegacyGame>("Game").deleteMany({ _id: { $regex: new RegExp(`^${GAME_PREFIX}`) } });
  const opponents = await db
    .collection<{ _id: string; name: string }>("Opponent")
    .find({ name: { $regex: /^Zztest Mig/i } })
    .toArray();
  for (const opponent of opponents) {
    await deleteOpponent(opponent._id);
  }
}

const MAPPING = [
  { canonicalName: "Zztest Mig Comets", rawNames: ["Zztest Mig Clevland Comets", "Zztest Mig Cleveland Comets"] },
  { canonicalName: "Zztest Mig Warbirds", rawNames: ["Zztest Mig Warbirds"] },
];

describe("opponent migration", () => {
  beforeAll(async () => {
    await ensureIndexes(await getDb());
  });

  beforeEach(async () => {
    await cleanUp();
    await (await games()).insertMany([
      legacyGame(`${GAME_PREFIX}01`, "Zztest Mig Clevland Comets"),
      legacyGame(`${GAME_PREFIX}02`, "Zztest Mig Clevland Comets"),
      legacyGame(`${GAME_PREFIX}03`, "Zztest Mig Cleveland Comets"),
      legacyGame(`${GAME_PREFIX}04`, "Zztest Mig Warbirds"),
    ]);
  });

  afterEach(cleanUp);

  it("previews without writing anything", async () => {
    const summary = await runOpponentMigration({ mapping: MAPPING, apply: false });

    expect(summary.unmappedRawNames).toEqual([]);
    expect(summary.planned).toEqual([
      {
        canonicalName: "Zztest Mig Comets",
        existingOpponentId: undefined,
        rawNames: [
          { name: "Zztest Mig Clevland Comets", gameCount: 2 },
          { name: "Zztest Mig Cleveland Comets", gameCount: 1 },
        ],
      },
      {
        canonicalName: "Zztest Mig Warbirds",
        existingOpponentId: undefined,
        rawNames: [{ name: "Zztest Mig Warbirds", gameCount: 1 }],
      },
    ]);
    expect(summary.applied).toBeUndefined();
    expect(await findOpponentByName("Zztest Mig Comets")).toBeNull();
    expect(await (await games()).countDocuments({ "opponentTeam.name": { $exists: true }, _id: { $regex: new RegExp(`^${GAME_PREFIX}`) } })).toBe(4);
  });

  it("refuses to apply while any raw name is unmapped, writing nothing", async () => {
    await expect(
      runOpponentMigration({ mapping: MAPPING.slice(0, 1), apply: true }),
    ).rejects.toThrow(/"Zztest Mig Warbirds"/);
    expect(await findOpponentByName("Zztest Mig Comets")).toBeNull();
  });

  it("maps variant spellings onto one opponent, swapping name for opponentId", async () => {
    const summary = await runOpponentMigration({ mapping: MAPPING, apply: true });

    expect(summary.applied).toEqual({ opponentsCreated: 2, gamesUpdated: 4 });
    expect(summary.verification?.problems).toEqual([]);

    const comets = await findOpponentByName("Zztest Mig Comets");
    const migrated = await (await games())
      .find({ _id: { $in: [`${GAME_PREFIX}01`, `${GAME_PREFIX}02`, `${GAME_PREFIX}03`] } })
      .toArray();
    for (const game of migrated) {
      expect(game.opponentTeam).toEqual({ opponentId: comets?._id, goals: [], penalties: [] });
    }
  });

  it("is a no-op on re-run", async () => {
    await runOpponentMigration({ mapping: MAPPING, apply: true });
    const second = await runOpponentMigration({ mapping: MAPPING, apply: true });

    expect(second.planned).toEqual([]);
    expect(second.applied).toEqual({ opponentsCreated: 0, gamesUpdated: 0 });
    expect(second.unusedRawNames).toHaveLength(3);
  });

  it("reuses an existing opponent with the canonical name, case-insensitively", async () => {
    const db = await getDb();
    await db.collection<{ _id: string }>("Opponent").insertOne({
      _id: "OPN999701",
      name: "ZZTEST MIG WARBIRDS",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as { _id: string });

    const summary = await runOpponentMigration({ mapping: MAPPING, apply: true });

    expect(summary.applied?.opponentsCreated).toBe(1);
    const warbirds = await (await games()).findOne({ _id: `${GAME_PREFIX}04` });
    expect(warbirds?.opponentTeam).toMatchObject({ opponentId: "OPN999701" });
  });

  it("rejects a mapping that maps one raw name twice", async () => {
    await expect(
      runOpponentMigration({
        mapping: [
          ...MAPPING,
          { canonicalName: "Zztest Mig Other", rawNames: ["Zztest Mig Warbirds"] },
        ],
        apply: false,
      }),
    ).rejects.toThrow(/mapped by both/);
  });
});
