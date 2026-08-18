import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../../lib/mongodb";
import { runPublish } from "../../lib/publish/run";
import { getPublishStatus } from "../../lib/publish/status";
import {
  createPlayer,
  createSeason,
  getTheTeam,
  updatePlayer,
  updateTeam,
} from "../../lib/repositories";
import type { Player, PlayerCreateInput } from "../../lib/schemas";

// Runs against the local Docker Mongo (see docs/06-local-development.md) —
// no mocking, matching this repo's existing integration-test convention.
// Verifies the indicator across every entity type named in KAN-32's
// acceptance criteria: players, games (via the shared seed data already in
// the dev database), seasons, and team.
//
// Every test establishes its own baseline via a real runPublish() rather
// than fabricating a Publishes document with an arbitrary timestamp: other
// integration test files run concurrently against this same database (see
// publish-run.test.ts), and a fabricated "latest successful publish" would
// win getLatestSuccessfulPublish's sort for whichever test reads it next,
// corrupting an unrelated file's baseline. A real runPublish() always
// reflects genuinely-current data, so it can't do that.
describe("getPublishStatus", () => {
  const createdPlayerIds: string[] = [];
  const createdSeasonIds: string[] = [];
  const createdPublishIds: string[] = [];

  // teamId is required on PlayerCreateInput but not itself under test here —
  // resolved from the real seeded team, same as createGameAction does via
  // getTheTeam(), rather than guessing a hardcoded id.
  let nextNumber = 88;
  async function createTestPlayer(
    overrides: Partial<PlayerCreateInput> = {},
  ): Promise<Player> {
    const team = await getTheTeam();
    if (!team) {
      throw new Error("Seeded dev database has no team document");
    }
    const player = await createPlayer({
      firstName: "Freshness",
      surname: "Indicator",
      number: nextNumber++,
      positions: ["Forward"],
      active: true,
      teamId: team._id,
      ...overrides,
    });
    createdPlayerIds.push(player._id);
    return player;
  }

  afterEach(async () => {
    const db = await getDb();
    if (createdPlayerIds.length > 0) {
      await db
        .collection<{ _id: string }>("players")
        .deleteMany({ _id: { $in: createdPlayerIds.splice(0) } });
    }
    if (createdSeasonIds.length > 0) {
      await db
        .collection<{ _id: string }>("seasons")
        .deleteMany({ _id: { $in: createdSeasonIds.splice(0) } });
    }
    if (createdPublishIds.length > 0) {
      await db
        .collection<{ _id: string }>("publishes")
        .deleteMany({ _id: { $in: createdPublishIds.splice(0) } });
    }
  });

  it("has no unpublished changes right after a successful publish", async () => {
    const publish = await runPublish();
    createdPublishIds.push(publish._id);

    const status = await getPublishStatus();
    expect(status.hasUnpublishedChanges).toBe(false);
  });

  it("flags unpublished changes when a player is created after the last publish", async () => {
    const publish = await runPublish();
    createdPublishIds.push(publish._id);

    await createTestPlayer();

    const status = await getPublishStatus();
    expect(status.hasUnpublishedChanges).toBe(true);
  });

  it("flags unpublished changes when an existing player is updated after the last publish", async () => {
    const player = await createTestPlayer();

    const publish = await runPublish();
    createdPublishIds.push(publish._id);
    expect((await getPublishStatus()).hasUnpublishedChanges).toBe(false);

    await updatePlayer(player._id, { nickname: "Fresh" });

    const status = await getPublishStatus();
    expect(status.hasUnpublishedChanges).toBe(true);
  });

  it("flags unpublished changes when a season is created after the last publish", async () => {
    const publish = await runPublish();
    createdPublishIds.push(publish._id);

    const season = await createSeason({ name: "41/42" });
    createdSeasonIds.push(season._id);

    const status = await getPublishStatus();
    expect(status.hasUnpublishedChanges).toBe(true);
  });

  it("flags unpublished changes when the team is updated after the last publish", async () => {
    const publish = await runPublish();
    createdPublishIds.push(publish._id);
    expect((await getPublishStatus()).hasUnpublishedChanges).toBe(false);

    const team = await getTheTeam();
    if (!team) {
      throw new Error("Seeded dev database has no team document");
    }
    await updateTeam(team._id, { name: team.name });

    const status = await getPublishStatus();
    expect(status.hasUnpublishedChanges).toBe(true);
  });

  it("clears after publishing the changes", async () => {
    const firstPublish = await runPublish();
    createdPublishIds.push(firstPublish._id);

    await createTestPlayer();
    expect((await getPublishStatus()).hasUnpublishedChanges).toBe(true);

    const publish = await runPublish();
    createdPublishIds.push(publish._id);

    const status = await getPublishStatus();
    expect(status.hasUnpublishedChanges).toBe(false);
  });
});
