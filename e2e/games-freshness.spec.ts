import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createSeason } from "@/lib/repositories";
import { getDb } from "@/lib/mongodb";

// Regression test for the `export const dynamic = "force-dynamic"` fix on
// `/games` and `/games/new`: without it, Next would statically prerender
// these pages at build time and freeze them to whatever the database held
// then. These tests write data directly (via the repository layer, same
// process the running app uses) and confirm it is visible without a rebuild.
//
// Uses Node's native .env loader, mirroring tests/integration/setup.ts, so
// this test process shares the same MONGODB_URI as the built app under test.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}

test.describe.configure({ mode: "serial" });

test.describe("games and games/new reflect data created after server start", () => {
  test("a game created after server start appears on /games", async ({
    page,
  }) => {
    await page.goto("/games/new");
    await page.getByLabel("Date").fill("2023-09-01");
    await page.getByLabel("Season").selectOption({ label: "23/24" });
    await page.getByLabel("Opponent").fill("Freshness Test Opponent");
    await page.getByRole("checkbox", { name: /Jamie Ashworth/ }).check();
    await page.getByRole("button", { name: "Create game" }).click();
    await expect(page).toHaveURL(/\/games\/GME\d+$/);

    await page.goto("/games");
    await expect(
      page.getByRole("row", { name: /Freshness Test Opponent/ }),
    ).toBeVisible();
  });

  test("a season added directly to the database after server start appears as a selectable option on /games/new", async ({
    page,
  }) => {
    const season = await createSeason({ name: "40/41" });
    try {
      await page.goto("/games/new");
      await expect(
        page.getByLabel("Season").locator("option", { hasText: "40/41" }),
      ).toHaveCount(1);
    } finally {
      const db = await getDb();
      await db.collection<{ _id: string }>("seasons").deleteOne({ _id: season._id });
    }
  });

  test("an active player created after server start appears as a selectable roster option on /games/new", async ({
    page,
  }) => {
    await page.goto("/players/new");
    await page.getByLabel("First name").fill("Freshness");
    await page.getByLabel("Surname").fill("TestPlayer");
    await page.getByLabel("Shirt number").fill("77");
    await page.getByRole("checkbox", { name: "Forward" }).check();
    await page.getByRole("button", { name: "Create player" }).click();
    await expect(page).toHaveURL(/\/players$/);

    await page.goto("/games/new");
    await expect(
      page.getByRole("checkbox", { name: /Freshness TestPlayer/ }),
    ).toBeVisible();
  });
});
