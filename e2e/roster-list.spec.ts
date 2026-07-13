import { expect, test } from "@playwright/test";

// Read-only assertions against the seeded roster (seed/data/players.ts) —
// no group counts are asserted since create-player.spec.ts mutates the same
// shared database and may run concurrently.
test.describe("player roster list", () => {
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
