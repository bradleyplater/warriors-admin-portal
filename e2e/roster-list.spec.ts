import { existsSync } from "node:fs";
import type { Document } from "mongodb";
import { expect, test } from "@playwright/test";
import { createPlayer, deletePlayer, getTheTeam } from "@/lib/repositories";
import { getDb } from "@/lib/mongodb";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}

// Read-only assertions against the seeded roster (seed/data/players.ts) —
// no group counts are asserted since create-player.spec.ts mutates the same
// shared database and may run concurrently. The fixture-based regression
// test below runs first, serially, so its own create/cleanup can't race
// with the read-only assertions.
test.describe.configure({ mode: "serial" });

test.describe("player roster list", () => {
  test("renders without crashing when an inactive player has an out-of-range legacy number (D9, KAN-36)", async ({
    page,
  }) => {
    // Regression test: an inactive player's number is never required to be
    // fixed by the D9 migration review (only active players are), so a
    // stale out-of-range value like this persists indefinitely in real
    // production — listPlayers() must tolerate it rather than crash /players.
    const team = await getTheTeam();
    if (!team) throw new Error("No team configured for the e2e seed");

    const player = await createPlayer({
      firstName: "Legacy",
      surname: "OutOfRangeFixture",
      number: 40,
      positions: ["Forward"],
      active: false,
      teamId: team._id,
    });
    const db = await getDb();
    await db
      .collection<Document & { _id: string }>("Player")
      .updateOne({ _id: player._id }, { $set: { number: 134 } });

    try {
      await page.goto("/players");

      await expect(
        page.getByRole("heading", { name: /^Active/ }),
      ).toBeVisible();
      const row = page.getByRole("row", { name: /Legacy OutOfRangeFixture/ });
      await expect(row).toBeVisible();
      await expect(row).toContainText("134");
    } finally {
      await deletePlayer(player._id);
    }
  });

  test("seeded players render, grouped by active status", async ({ page }) => {
    await page.goto("/players");

    await expect(
      page.getByRole("heading", { name: /^Active/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Inactive/ }),
    ).toBeVisible();

    // Jamie Ashworth, #9, active: true.
    const activeRow = page.getByRole("row", { name: /Jamie Ashworth/ });
    await expect(activeRow).toContainText("9");
    await expect(activeRow).toContainText("Forward");
    await expect(activeRow).toContainText("Robbo");

    // Sam Elliston, #19, active: false.
    const inactiveRow = page.getByRole("row", { name: /Sam Elliston/ });
    await expect(inactiveRow).toContainText("19");
  });

  test("active and inactive players are in separate sections", async ({
    page,
  }) => {
    await page.goto("/players");

    const activeSection = page.getByTestId("active-section");
    const inactiveSection = page.getByTestId("inactive-section");

    await expect(
      activeSection.getByRole("row", { name: /Jamie Ashworth/ }),
    ).toBeVisible();
    await expect(
      activeSection.getByRole("row", { name: /Sam Elliston/ }),
    ).toHaveCount(0);

    await expect(
      inactiveSection.getByRole("row", { name: /Sam Elliston/ }),
    ).toBeVisible();
    await expect(
      inactiveSection.getByRole("row", { name: /Jamie Ashworth/ }),
    ).toHaveCount(0);
  });

  test("add new player button navigates to the create route", async ({
    page,
  }) => {
    await page.goto("/players");

    await page.getByRole("link", { name: "Add new player" }).click();

    await expect(page).toHaveURL(/\/players\/new$/);
    await expect(
      page.getByRole("heading", { name: "Add new player" }),
    ).toBeVisible();
  });
});
