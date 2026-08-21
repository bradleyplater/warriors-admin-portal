import { existsSync } from "node:fs";
import type { Document } from "mongodb";
import { expect, test } from "@playwright/test";
import { createPlayer, deletePlayer, getTheTeam } from "@/lib/repositories";
import { getDb } from "@/lib/mongodb";

// Testing Strategy journey 7 (docs/05-testing-strategy.md): the active-flags
// half of the migration review screens (D8). Each test creates or inserts
// its own player and cleans it up, rather than editing the seed fixtures,
// so the shared local database stays stable across other specs — same
// convention as edit-player.spec.ts and games-freshness.spec.ts.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}

test.describe.configure({ mode: "serial" });

test.describe("migration review — active flags", () => {
  test("a player still missing `active` (real pre-Step-2 production shape) can be marked Active, and it persists", async ({
    page,
  }) => {
    const team = await getTheTeam();
    if (!team) throw new Error("No team configured for the e2e seed");

    const playerId = "PLRE2EMR01";
    const db = await getDb();
    await db.collection<Document & { _id: string }>("players").insertOne({
      _id: playerId,
      firstName: "Unreviewed",
      surname: "Fixture",
      number: 96,
      positions: ["Forward"],
      teamId: team._id,
      createdAt: new Date(),
      updatedAt: new Date(),
      // no `active` — the review screen must tolerate this
    });

    try {
      await page.goto("/migration-review/active");

      const row = page.getByRole("row", { name: /Unreviewed Fixture/ });
      await expect(row).toBeVisible();
      await expect(row.getByText("Not yet reviewed")).toBeVisible();

      await row.getByRole("button", { name: "Active", exact: true }).click();
      await expect(row.getByText("Not yet reviewed")).toHaveCount(0);
      await expect(
        row.getByRole("button", { name: "Active", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");

      await page.reload();
      const reloadedRow = page.getByRole("row", { name: /Unreviewed Fixture/ });
      await expect(
        reloadedRow.getByRole("button", { name: "Active", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    } finally {
      await db
        .collection<Document & { _id: string }>("players")
        .deleteOne({ _id: playerId });
    }
  });

  test("changing an already-reviewed player's flag persists across reload", async ({
    page,
  }) => {
    const team = await getTheTeam();
    if (!team) throw new Error("No team configured for the e2e seed");

    const player = await createPlayer({
      firstName: "Reviewed",
      surname: "Fixture",
      number: 97,
      positions: ["Defence"],
      active: true,
      teamId: team._id,
    });

    try {
      await page.goto("/migration-review/active");

      const row = page.getByRole("row", { name: /Reviewed Fixture/ });
      await expect(
        row.getByRole("button", { name: "Active", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");

      await row.getByRole("button", { name: "Inactive" }).click();
      await expect(
        row.getByRole("button", { name: "Inactive" }),
      ).toHaveAttribute("aria-pressed", "true");

      await page.reload();
      const reloadedRow = page.getByRole("row", { name: /Reviewed Fixture/ });
      await expect(
        reloadedRow.getByRole("button", { name: "Inactive" }),
      ).toHaveAttribute("aria-pressed", "true");
    } finally {
      await deletePlayer(player._id);
    }
  });
});
