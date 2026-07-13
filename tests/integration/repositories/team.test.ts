import { describe, expect, it } from "vitest";
import { getTeam, getTheTeam, updateTeam } from "../../../lib/repositories";
import * as teamRepository from "../../../lib/repositories/team";

// Seeded fixture team (seed/data/constants.ts) — the team repository has no
// `create`, so tests read/update the one document seeding already created.
const TEAM_ID = "TM551420";

describe("team repository", () => {
  it("reads the seeded team", async () => {
    const team = await getTeam(TEAM_ID);
    expect(team?._id).toBe(TEAM_ID);
  });

  it("updates the team, stamping updatedAt, and leaves the name restorable", async () => {
    const before = await getTeam(TEAM_ID);
    if (!before) {
      throw new Error(
        `Seeded team "${TEAM_ID}" not found — run \`npm run db:seed\` before the integration suite.`,
      );
    }

    const updated = await updateTeam(TEAM_ID, { name: "ZZTEST Name" });
    expect(updated.name).toBe("ZZTEST Name");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.updatedAt.getTime(),
    );

    await updateTeam(TEAM_ID, { name: before.name });
  });

  it("has no create operation", () => {
    expect("createTeam" in teamRepository).toBe(false);
  });

  it("reads the sole team without requiring its id", async () => {
    const team = await getTheTeam();
    expect(team?._id).toBe(TEAM_ID);
  });
});
