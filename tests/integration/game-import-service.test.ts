import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import {
  createOpponent,
  createPlayer,
  deleteGame,
  deleteOpponent,
  deletePlayer,
  ensureIndexes,
  getGame,
  getTheTeam,
  listSeasons,
} from "../../lib/repositories";
import {
  previewGameImport,
  saveGameImport,
} from "../../lib/games/import-service";
import type { ImportResolutions } from "../../lib/game-import/types";

// Runs against the local Docker Mongo, like the other service tests.
const CSV = readFileSync(
  join(__dirname, "../../lib/game-import/__fixtures__/bradford-14-11-26.csv"),
  "utf-8",
);

// The fixture's 16 Warriors. Created inactive and without numbers so they
// can't collide with seeded active players' shirt numbers; the import then
// resolves each sheet number to them explicitly.
const SHEET_PLAYERS: [string, string, string][] = [
  ["31", "Zztest A", "Beeton-Jones"],
  ["24", "Zztest A", "Johnson"],
  ["2", "Zztest A", "Barker"],
  ["67", "Zztest B", "Warby"],
  ["82", "Zztest C", "Phillips"],
  ["72", "Zztest D", "Sztymon"],
  ["88", "Zztest D", "Bush"],
  ["59", "Zztest L", "Coulby-Mills"],
  ["3", "Zztest M", "Silsby"],
  ["43", "Zztest N", "Eves"],
  ["93", "Zztest P", "Hutchcraft"],
  ["17", "Zztest P", "Bird"],
  ["63", "Zztest R", "Davies"],
  ["33", "Zztest S", "Miljons"],
  ["6", "Zztest S", "Zutis"],
  ["39", "Zztest S", "Davies"],
];

async function gameCount(): Promise<number> {
  const db = await getDb();
  return db.collection("Game").countDocuments();
}

describe("game import service", () => {
  const playerIds: Record<string, string> = {};
  const createdGameIds: string[] = [];
  let opponentId = "";
  let seasonId = "";

  const resolutions = (): ImportResolutions => ({
    opponentId,
    seasonId,
    gameType: "CHALLENGE",
    players: { ...playerIds },
  });

  beforeAll(async () => {
    const db = await getDb();
    await ensureIndexes(db);
    const team = await getTheTeam();
    if (!team) throw new Error("Integration DB has no team — run the seed");
    for (const [number, firstName, surname] of SHEET_PLAYERS) {
      const player = await createPlayer({
        firstName,
        surname,
        positions: ["Forward"],
        active: false,
        teamId: team._id,
      });
      playerIds[number] = player._id;
    }
    const opponent = await createOpponent({
      name: `Zztest Import ${Date.now()}`,
    });
    opponentId = opponent._id;
    seasonId = (await listSeasons())[0]._id;
  });

  afterAll(async () => {
    for (const id of createdGameIds)
      await deleteGame(id).catch(() => undefined);
    for (const id of Object.values(playerIds)) {
      await deletePlayer(id).catch(() => undefined);
    }
    if (opponentId) await deleteOpponent(opponentId).catch(() => undefined);
  });

  it("preview writes nothing", async () => {
    const before = await gameCount();
    const result = await previewGameImport(CSV, resolutions());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.flags).toEqual([]);
      expect(result.preview.input).not.toBeNull();
    }
    expect(await gameCount()).toBe(before);
  });

  it("rejects a file that isn't a game sheet", async () => {
    const result = await previewGameImport("a,b\n1,2\n", {});
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("isn't a recognised game sheet"),
    });
  });

  it("does not save while anything is flagged", async () => {
    const before = await gameCount();
    const withoutPlayers = { ...resolutions(), players: {} };
    const result = await saveGameImport(CSV, withoutPlayers);
    expect(result.ok).toBe(false);
    expect(await gameCount()).toBe(before);
  });

  it("does not save when the chosen opponent has been deleted", async () => {
    const gone = await createOpponent({ name: `Zztest Gone ${Date.now()}` });
    await deleteOpponent(gone._id);
    const before = await gameCount();
    const result = await saveGameImport(CSV, {
      ...resolutions(),
      opponentId: gone._id,
    });
    expect(result.ok).toBe(false);
    expect(await gameCount()).toBe(before);
  });

  it("saves the whole game when every flag is resolved", async () => {
    const result = await saveGameImport(CSV, resolutions());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdGameIds.push(result.gameId);

    const game = await getGame(result.gameId);
    expect(game).not.toBeNull();
    expect(game!.location).toBe("AWAY");
    expect(game!.date).toEqual(new Date("2026-11-14"));
    expect(game!.opponentTeam.opponentId).toBe(opponentId);
    expect(game!.team.roster).toHaveLength(16);
    expect(game!.team.goals).toHaveLength(11);
    expect(game!.team.penalties).toHaveLength(2);
    expect(game!.opponentTeam.goals).toHaveLength(2);
    expect(game!.opponentTeam.penalties).toHaveLength(2);
    expect(game!.team.goals.every((goal) => goal._id.startsWith("GOL"))).toBe(
      true,
    );
  });
});
