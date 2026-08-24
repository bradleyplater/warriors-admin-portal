import type { Db, Document } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { generateReconciliationReport } from "../../lib/migration/reconcile/report";
import { isReconciliationComplete } from "../../lib/migration/reconcile/status";
import { createReconciliationResolution } from "../../lib/repositories";
import type { Mismatch } from "../../lib/migration/reconcile/types";

// Reproduces the four known-shape discrepancies from docs/04-migration-plan.md's
// "Known discrepancies" table, plus a shootout game and a plain game-score
// drift, against fixtures inserted directly (bypassing the seed module) —
// same convention as tests/integration/migration-additive.test.ts, since
// these represent a pre-reconciliation production shape no dev/e2e flow
// should ever see once migrated.
//
// The app is single-team (see lib/repositories/team.ts's getTheTeam), and
// generateReconciliationReport() reads the one Team document via a raw
// findOne({}) — so this suite never inserts a second Team doc (that would
// make which one gets read non-deterministic). Instead it merges its
// fixture players/stats onto whatever Team document already exists (or
// inserts one only if the database is genuinely empty), and restores the
// original afterward.
describe("generateReconciliationReport", () => {
  const SEASON_A = "SSN9001"; // 17 real games, Team.stats says 16
  const SEASON_B = "SSN9002"; // 24 real games, Team.stats says 25
  const SEASON_C = "SSN9003"; // 25 real games, Team.stats says 24; also hosts the player drift
  const FIXTURE_SEASON_IDS = [SEASON_A, SEASON_B, SEASON_C];
  const PLAYER_ID = "PLR900037";
  const FIXTURE_TEAM_ID = "TM900037"; // only used if the DB has no Team doc at all

  const gameIds: string[] = [];
  let teamId = FIXTURE_TEAM_ID;
  let originalTeamDoc: Fixture | null = null;
  let teamDocInserted = false;

  type Fixture = Document & { _id: string };
  type FixtureInput = Record<string, unknown> & { _id: string };

  function col(db: Db, name: string) {
    return db.collection<Fixture>(name);
  }

  function baseGame(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      date: new Date("2026-01-01"),
      type: "CHALLENGE",
      location: "HOME",
      team: { id: "TM000000", roster: [], goals: [], penalties: [] },
      opponentTeam: { name: "Opponents", goals: [], penalties: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
      score: {
        team: 0,
        opponent: 0,
        periods: [
          { number: 1, team: 0, opponent: 0 },
          { number: 2, team: 0, opponent: 0 },
          { number: 3, team: 0, opponent: 0 },
        ],
      },
      ...overrides,
    };
  }

  function plainGames(
    seasonId: string,
    idPrefix: string,
    count: number,
  ): FixtureInput[] {
    return Array.from({ length: count }, (_, index) => ({
      _id: `${idPrefix}${String(index).padStart(3, "0")}`,
      seasonId,
      ...baseGame(),
    }));
  }

  async function mergeFixturesOntoTeam(
    db: Db,
    extraPlayers: Record<string, unknown>[],
    extraStats: Record<string, unknown>[],
  ): Promise<void> {
    const existing = await col(db, "Team").findOne({});
    if (!existing) {
      teamId = FIXTURE_TEAM_ID;
      teamDocInserted = true;
      await col(db, "Team").insertOne({
        _id: teamId,
        name: "KAN-37 Fixture Team",
        players: extraPlayers,
        stats: extraStats,
      } as Fixture);
      return;
    }

    originalTeamDoc = existing;
    teamId = existing._id;
    const existingPlayers = Array.isArray(existing.players)
      ? (existing.players as Record<string, unknown>[])
      : [];
    const existingStats = Array.isArray(existing.stats)
      ? (existing.stats as Record<string, unknown>[])
      : [];

    await col(db, "Team").updateOne(
      { _id: teamId },
      {
        $set: {
          players: [...existingPlayers, ...extraPlayers],
          stats: [
            ...existingStats.filter(
              (entry) => !FIXTURE_SEASON_IDS.includes(entry.seasonId as string),
            ),
            ...extraStats,
          ],
        },
      },
    );
  }

  async function insertFixtures(): Promise<void> {
    const db = await getDb();

    const seasonAGames = plainGames(SEASON_A, "GMEK37A", 15);
    const scoreDriftGame = {
      _id: "GMEK37ASCORE",
      seasonId: SEASON_A,
      ...baseGame({
        // No goals recorded at all, but the stored total says the team
        // scored 5 — a stored/computed disagreement independent of the
        // games-played drift.
        score: {
          team: 5,
          opponent: 0,
          periods: [
            { number: 1, team: 0, opponent: 0 },
            { number: 2, team: 0, opponent: 0 },
            { number: 3, team: 0, opponent: 0 },
          ],
        },
      }),
    };
    const shootoutGame = {
      _id: "GMEK37ASO",
      seasonId: SEASON_A,
      ...baseGame({
        team: {
          id: "TM000000",
          roster: [{ playerId: "PLRK37SO" }],
          goals: [
            {
              _id: "GOL1",
              scoredBy: "PLRK37SO",
              assist1: "",
              assist2: "",
              minute: 0,
              second: 0,
              type: "SO",
            },
          ],
          penalties: [],
        },
        // Team wins the shootout 1-0, correctly reflected in the stored total.
        score: {
          team: 1,
          opponent: 0,
          periods: [
            { number: 1, team: 0, opponent: 0 },
            { number: 2, team: 0, opponent: 0 },
            { number: 3, team: 0, opponent: 0 },
          ],
        },
      }),
    };
    // 15 + score-drift game + shootout game = 17 real games in SEASON_A.
    const allSeasonAGames = [...seasonAGames, scoreDriftGame, shootoutGame];

    const seasonBGames = plainGames(SEASON_B, "GMEK37B", 24);

    const seasonCPlainGames = plainGames(SEASON_C, "GMEK37C", 15);
    const seasonCPlayerGames = Array.from({ length: 10 }, (_, index) => ({
      _id: `GMEK37CP${String(index).padStart(3, "0")}`,
      seasonId: SEASON_C,
      ...baseGame({
        team: {
          id: "TM000000",
          roster: [{ playerId: PLAYER_ID }],
          goals: [],
          penalties: [],
        },
      }),
    }));
    // 15 + 10 = 25 real games in SEASON_C.
    const allSeasonCGames = [...seasonCPlainGames, ...seasonCPlayerGames];

    const allGames = [
      ...allSeasonAGames,
      ...seasonBGames,
      ...allSeasonCGames,
    ] as FixtureInput[];
    gameIds.push(...allGames.map((g) => String(g._id)));

    await col(db, "Game").insertMany(allGames as Fixture[]);

    await col(db, "Seasons").insertMany([
      { _id: SEASON_A, name: "90/01", createdAt: new Date(), updatedAt: new Date() },
      { _id: SEASON_B, name: "90/02", createdAt: new Date(), updatedAt: new Date() },
      { _id: SEASON_C, name: "90/03", createdAt: new Date(), updatedAt: new Date() },
    ] as Fixture[]);

    await col(db, "Player").insertOne({
      _id: PLAYER_ID,
      firstName: "Fixture",
      surname: "Player",
      stats: [
        { seasonId: SEASON_C, gamesPlayed: 10, goals: 0, assists: 0, pims: 0 },
      ],
    } as Fixture);

    await mergeFixturesOntoTeam(
      db,
      [
        {
          playerId: PLAYER_ID,
          stats: [
            { seasonId: SEASON_C, gamesPlayed: 9, goals: 0, assists: 0, pims: 0 },
          ],
        },
      ],
      [
        // goals: 1 accounts for the shootout goal above — deriveTeamSeasonStats
        // counts every team goal regardless of type.
        { seasonId: SEASON_A, gamesPlayed: 16, goals: 1, assists: 0, pims: 0 },
        { seasonId: SEASON_B, gamesPlayed: 25, goals: 0, assists: 0, pims: 0 },
        { seasonId: SEASON_C, gamesPlayed: 24, goals: 0, assists: 0, pims: 0 },
      ],
    );
  }

  afterEach(async () => {
    const db = await getDb();
    await Promise.all([
      col(db, "Game").deleteMany({ _id: { $in: gameIds.splice(0) } }),
      col(db, "Seasons").deleteMany({ _id: { $in: FIXTURE_SEASON_IDS } }),
      col(db, "Player").deleteOne({ _id: PLAYER_ID }),
      db
        .collection<{ mismatchKey: string }>("reconciliationResolutions")
        .deleteMany({
          mismatchKey: { $regex: `^team-stats:${teamId}:(${SEASON_A}|${SEASON_B}|${SEASON_C}):` },
        }),
    ]);

    if (teamDocInserted) {
      await col(db, "Team").deleteOne({ _id: teamId });
      teamDocInserted = false;
    } else if (originalTeamDoc) {
      await col(db, "Team").replaceOne({ _id: teamId }, originalTeamDoc);
      originalTeamDoc = null;
    }
  });

  function byKey(mismatches: Mismatch[], key: string): Mismatch | undefined {
    return mismatches.find((m) => m.key === key);
  }

  it("detects and reports the seeded drift exactly", async () => {
    await insertFixtures();

    const report = await generateReconciliationReport();
    const ours = report.filter(
      (m) =>
        ("seasonId" in m && FIXTURE_SEASON_IDS.includes(m.seasonId)) ||
        m.entityId.startsWith("GMEK37"),
    );

    expect(ours).toHaveLength(5);
    expect(ours.every((m) => m.resolved === false)).toBe(true);

    expect(byKey(ours, `team-stats:${teamId}:${SEASON_A}:gamesPlayed`)).toMatchObject(
      { storedValue: 16, computedValue: 17 },
    );
    expect(byKey(ours, `team-stats:${teamId}:${SEASON_B}:gamesPlayed`)).toMatchObject(
      { storedValue: 25, computedValue: 24 },
    );
    expect(byKey(ours, `team-stats:${teamId}:${SEASON_C}:gamesPlayed`)).toMatchObject(
      { storedValue: 24, computedValue: 25 },
    );
    expect(
      byKey(ours, `player-stats:${PLAYER_ID}:${SEASON_C}:gamesPlayed:teamCopy`),
    ).toMatchObject({ storedValue: 9, computedValue: 10 });
    // The player's own Player.stats copy agrees with the recompute, so no
    // "player" source mismatch — only "teamCopy" above.
    expect(
      byKey(ours, `player-stats:${PLAYER_ID}:${SEASON_C}:gamesPlayed:player`),
    ).toBeUndefined();

    expect(byKey(ours, "game-score:GMEK37ASCORE:score.team")).toMatchObject({
      storedValue: 5,
      computedValue: 0,
    });
    // The shootout game's +1 is correctly reflected in the stored total —
    // no mismatch for it at all.
    expect(byKey(ours, "game-score:GMEK37ASO:score.team")).toBeUndefined();

    expect(isReconciliationComplete(ours)).toBe(false);
  });

  it("marks a mismatch resolved after an acceptance, and un-resolves it again if the computed value later changes", async () => {
    await insertFixtures();

    const before = await generateReconciliationReport();
    const target = byKey(before, `team-stats:${teamId}:${SEASON_A}:gamesPlayed`);
    expect(target).toBeDefined();
    expect(target!.resolved).toBe(false);

    await createReconciliationResolution({
      mismatchKey: target!.key,
      dimension: "team-stats",
      entityId: teamId,
      field: "gamesPlayed",
      storedValue: target!.storedValue,
      computedValue: target!.computedValue,
      resolvedAt: new Date(),
    });

    const afterAccept = await generateReconciliationReport();
    expect(
      byKey(afterAccept, `team-stats:${teamId}:${SEASON_A}:gamesPlayed`)?.resolved,
    ).toBe(true);

    // A new game changes the computed value for the same key — the
    // acceptance no longer describes the current disagreement.
    const db = await getDb();
    const extraGameId = "GMEK37AEXTRA";
    gameIds.push(extraGameId);
    await col(db, "Game").insertOne({
      _id: extraGameId,
      seasonId: SEASON_A,
      ...baseGame(),
    } as Fixture);

    const afterChange = await generateReconciliationReport();
    const stillMatching = byKey(
      afterChange,
      `team-stats:${teamId}:${SEASON_A}:gamesPlayed`,
    );
    expect(stillMatching?.resolved).toBe(false);
    expect(stillMatching?.computedValue).toBe(18);
  });
});
