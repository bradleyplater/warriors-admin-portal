import { existsSync } from "node:fs";
import type { Document } from "mongodb";
import { expect, test } from "@playwright/test";
import { createPlayer, deletePlayer, getPlayer, getTheTeam } from "@/lib/repositories";
import { getDb } from "@/lib/mongodb";

// Testing Strategy journey 7 (docs/05-testing-strategy.md): the D9
// shirt-number half of the migration review screens. Each test creates or
// inserts its own player and cleans it up, rather than editing the seed
// fixtures — same convention as migration-review-active.spec.ts.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}

test.describe.configure({ mode: "serial" });

test.describe("migration review — shirt numbers", () => {
  test("an active player with an out-of-range number can be fixed via the UI, and it persists", async ({
    page,
  }) => {
    const team = await getTheTeam();
    if (!team) throw new Error("No team configured for the e2e seed");

    const playerId = "PLRE2EMNR01";
    const db = await getDb();
    await db.collection<Document & { _id: string }>("Player").insertOne({
      _id: playerId,
      firstName: "OutOfRange",
      surname: "Fixture",
      number: 134,
      positions: ["Forward"],
      active: true,
      teamId: team._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await page.goto("/migration-review/shirt-number");

      const row = page.getByRole("row", { name: /OutOfRange Fixture/ });
      await expect(row).toBeVisible();
      await expect(row.getByText("134")).toBeVisible();

      await row.getByRole("textbox").fill("42");
      await row.getByRole("button", { name: "Save" }).click();

      await expect(
        page.getByRole("row", { name: /OutOfRange Fixture/ }),
      ).toHaveCount(0);

      await page.reload();
      await expect(
        page.getByRole("row", { name: /OutOfRange Fixture/ }),
      ).toHaveCount(0);

      const updated = await getPlayer(playerId);
      expect(updated?.number).toBe(42);
    } finally {
      await db
        .collection<Document & { _id: string }>("Player")
        .deleteOne({ _id: playerId });
    }
  });

  test("submitting an out-of-range value shows an inline error and leaves the row in place", async ({
    page,
  }) => {
    const team = await getTheTeam();
    if (!team) throw new Error("No team configured for the e2e seed");

    const player = await createPlayer({
      firstName: "Invalid",
      surname: "Attempt",
      number: 40,
      positions: ["Defence"],
      active: true,
      teamId: team._id,
    });
    const db = await getDb();
    await db
      .collection<Document & { _id: string }>("Player")
      .updateOne({ _id: player._id }, { $set: { number: 150 } });

    try {
      await page.goto("/migration-review/shirt-number");

      const row = page.getByRole("row", { name: /Invalid Attempt/ });
      await expect(row).toBeVisible();

      await row.getByRole("textbox").fill("150");
      await row.getByRole("button", { name: "Save" }).click();

      await expect(row.getByText(/between 1 and 99/)).toBeVisible();
      await expect(
        page.getByRole("row", { name: /Invalid Attempt/ }),
      ).toBeVisible();
    } finally {
      await deletePlayer(player._id);
    }
  });
});
