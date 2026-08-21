import type { Db, Document } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { listPlayersForActiveReview } from "../../lib/migration/active-review/list";
import { isActiveReviewComplete } from "../../lib/migration/active-review/status";
import { describeActiveReviewSaveError } from "../../app/migration-review/active/error-messages";
import { createSeason, updatePlayer, DuplicateShirtNumberError } from "../../lib/repositories";

// Exercises updatePlayer() + describeActiveReviewSaveError() directly rather
// than the "use server" action itself — setPlayerActiveAction calls
// revalidatePath, which requires a real Next.js request context that only
// exists once the app is actually running (proven by
// e2e/migration-review-active.spec.ts instead).
async function saveActive(
  playerId: string,
  active: boolean,
): Promise<{ error?: string }> {
  try {
    await updatePlayer(playerId, { active });
  } catch (error) {
    const message = describeActiveReviewSaveError(error);
    if (message === undefined) {
      throw error;
    }
    return { error: message };
  }
  return {};
}

// Fixtures are inserted directly (bypassing the seed module), same
// convention as migration-additive.test.ts — they represent a genuinely
// pre-Step-2 production shape (Step 1's additive fields present, `active`
// still absent) that no dev/e2e flow should ever see once the review is
// complete.
describe("active-flags migration review", () => {
  const teamId = "TM900002";
  const seasonName = "77/78";
  const gameId = "GMEKAN35001";

  const reviewedPlayerId = "PLRKAN35001";
  const unreviewedPlayerId = "PLRKAN35002";
  const missingNumberPlayerId = "PLRKAN35003";
  const playerIds = [reviewedPlayerId, unreviewedPlayerId, missingNumberPlayerId];

  function col(db: Db, name: string) {
    return db.collection<Document & { _id: string }>(name);
  }

  let createdSeasonId: string | undefined;

  async function insertFixtures(seasonId: string): Promise<void> {
    const db = await getDb();
    await col(db, "Player").insertMany([
      {
        _id: reviewedPlayerId,
        firstName: "Already",
        surname: "Reviewed",
        number: 90,
        positions: ["Forward"],
        active: true,
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: unreviewedPlayerId,
        firstName: "Not",
        surname: "Reviewed",
        number: 91,
        positions: ["Defence"],
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
        // no `active` — the real post-Step-1, pre-Step-2 production shape
      },
      {
        _id: missingNumberPlayerId,
        firstName: "Missing",
        surname: "Number",
        positions: ["Forward"],
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
        // no `number`, no `active` — Step 1 somehow incomplete for this doc
      },
    ]);
    await col(db, "Game").insertOne({
      _id: gameId,
      seasonId,
      date: new Date(),
      type: "CHALLENGE",
      location: "HOME",
      team: {
        id: teamId,
        roster: [{ playerId: unreviewedPlayerId }],
        goals: [],
        penalties: [],
      },
      opponentTeam: { name: "Opponent", goals: [], penalties: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  afterEach(async () => {
    const db = await getDb();
    await Promise.all([
      col(db, "Player").deleteMany({ _id: { $in: playerIds } }),
      col(db, "Game").deleteOne({ _id: gameId }),
      createdSeasonId
        ? col(db, "Seasons").deleteOne({ _id: createdSeasonId })
        : Promise.resolve(),
    ]);
    createdSeasonId = undefined;
  });

  it("lists players missing active, and hints who played the current season", async () => {
    const season = await createSeason({ name: seasonName });
    createdSeasonId = season._id;
    await insertFixtures(season._id);

    const players = await listPlayersForActiveReview();

    const reviewed = players.find((p) => p.playerId === reviewedPlayerId);
    expect(reviewed?.active).toBe(true);

    const unreviewed = players.find((p) => p.playerId === unreviewedPlayerId);
    expect(unreviewed?.active).toBeUndefined();
    expect(unreviewed?.playedCurrentSeason).toBe(true);

    const missingNumber = players.find(
      (p) => p.playerId === missingNumberPlayerId,
    );
    expect(missingNumber?.number).toBeNull();
    expect(missingNumber?.active).toBeUndefined();

    expect(isActiveReviewComplete(players)).toBe(false);
  });

  it("saving a row sets active without disturbing the others", async () => {
    const season = await createSeason({ name: "78/79" });
    createdSeasonId = season._id;
    await insertFixtures(season._id);

    const result = await saveActive(unreviewedPlayerId, true);
    expect(result.error).toBeUndefined();

    const players = await listPlayersForActiveReview();
    const saved = players.find((p) => p.playerId === unreviewedPlayerId);
    expect(saved?.active).toBe(true);

    const stillUnreviewed = players.find(
      (p) => p.playerId === missingNumberPlayerId,
    );
    expect(stillUnreviewed?.active).toBeUndefined();
  });

  it("saving a row with an incomplete Step 1 doc returns a friendly error, not a crash", async () => {
    const season = await createSeason({ name: "79/80" });
    createdSeasonId = season._id;
    await insertFixtures(season._id);

    const result = await saveActive(missingNumberPlayerId, true);

    expect(result.error).toMatch(/missing required migration data/);
  });

  it("saving into a colliding shirt number surfaces DuplicateShirtNumberError as a row error", async () => {
    const season = await createSeason({ name: "80/81" });
    createdSeasonId = season._id;
    await insertFixtures(season._id);

    // unreviewedPlayerId has number 91; give it the same number as the
    // already-active reviewedPlayerId (90) to force a collision on save.
    const db = await getDb();
    await col(db, "Player").updateOne(
      { _id: unreviewedPlayerId },
      { $set: { number: 90 } },
    );

    const result = await saveActive(unreviewedPlayerId, true);

    expect(result.error).toBe(new DuplicateShirtNumberError(90).message);
  });

  it("running the same save twice is a harmless no-op the second time", async () => {
    const season = await createSeason({ name: "81/82" });
    createdSeasonId = season._id;
    await insertFixtures(season._id);

    const first = await saveActive(unreviewedPlayerId, false);
    const second = await saveActive(unreviewedPlayerId, false);

    expect(first.error).toBeUndefined();
    expect(second.error).toBeUndefined();

    const players = await listPlayersForActiveReview();
    expect(players.find((p) => p.playerId === unreviewedPlayerId)?.active).toBe(
      false,
    );
  });
});
