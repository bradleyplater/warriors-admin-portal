import { expect, test } from "@playwright/test";

test.describe("player profile", () => {
  test("clicking a roster row navigates to that player's profile", async ({
    page,
  }) => {
    await page.goto("/players");

    // Jamie Ashworth, #9, active: true (seed/data/players.ts).
    await page.getByRole("row", { name: /Jamie Ashworth/ }).click();

    await expect(page).toHaveURL(/\/players\/PLR\d+$/);
    await expect(
      page.getByRole("heading", { name: /Jamie Ashworth/ }),
    ).toBeVisible();
    await expect(page.getByText("Forward")).toBeVisible();
  });

  test("edit icon still navigates to the edit route, not the profile", async ({
    page,
  }) => {
    await page.goto("/players");

    await page
      .getByRole("link", { name: /Edit Jamie Ashworth/ })
      .click();

    await expect(page).toHaveURL(/\/players\/PLR\d+\/edit$/);
    await expect(
      page.getByRole("heading", { name: /Edit Jamie Ashworth/ }),
    ).toBeVisible();
  });

  test("profile shows season-grouped games, ascending by season", async ({
    page,
  }) => {
    // Ryan Faulkner, #4 — not rostered by any create-game.spec.ts test, so
    // his per-season counts stay at the pristine seed values regardless of
    // what else this shared database run creates.
    await page.goto("/players");
    await page.getByRole("row", { name: /Ryan Faulkner/ }).click();

    // Seasons render ascending, one section per season, every seeded game
    // included (seed/data/games.ts rosters every active player in every game).
    const headings = page.getByRole("heading", { level: 3 });
    await expect(headings).toHaveText([
      "22/23 (2)",
      "23/24 (2)",
      "24/25 (3)",
      "25/26 (3)",
    ]);
  });
});
