import { expect, test } from "@playwright/test";

// Tests share the local seeded database, so each test uses a season start
// year unlikely to collide with the seed fixtures (seed/data/seasons.ts,
// which covers SSN2223..SSN2526) or with each other.
test.describe.configure({ mode: "serial" });

test.describe("create a season", () => {
  test("valid submission creates a season and redirects to the seasons list", async ({
    page,
  }) => {
    await page.goto("/seasons/new");

    await page.getByLabel("Start year").fill("2071");
    await page.getByRole("button", { name: "Create season" }).click();

    await expect(page).toHaveURL(/\/seasons$/);
    await expect(page.getByRole("row", { name: /71\/72/ })).toContainText(
      "SSN7172",
    );
  });

  test("new season immediately appears in the game-creation season picker", async ({
    page,
  }) => {
    await page.goto("/games/new");

    const season = page.getByLabel("Season");
    await season.selectOption({ label: "71/72" });
    await expect(season).toHaveValue("SSN7172");
  });

  test("new season appears as its own section on the games list, with a 0 count", async ({
    page,
  }) => {
    await page.goto("/games");

    const section = page.getByTestId("season-SSN7172");
    await expect(section.locator("h2, h3")).toContainText("71/72 (0)");
  });

  test("non-numeric start year is rejected", async ({ page }) => {
    await page.goto("/seasons/new");

    await page.getByLabel("Start year").fill("abc");
    await page.getByRole("button", { name: "Create season" }).click();

    await expect(page).toHaveURL(/\/seasons\/new$/);
    await expect(
      page.getByText("Start year must be a 4-digit year"),
    ).toBeVisible();
  });

  test("out-of-range start year is rejected", async ({ page }) => {
    await page.goto("/seasons/new");

    await page.getByLabel("Start year").fill("1999");
    await page.getByRole("button", { name: "Create season" }).click();

    await expect(page).toHaveURL(/\/seasons\/new$/);
    await expect(
      page.getByText("Start year must be between 2000 and 2099"),
    ).toBeVisible();
  });

  test("duplicate season is rejected", async ({ page }) => {
    // SSN2526 / "25/26" already exists in seed/data/seasons.ts.
    await page.goto("/seasons/new");

    await page.getByLabel("Start year").fill("2025");
    await page.getByRole("button", { name: "Create season" }).click();

    await expect(page).toHaveURL(/\/seasons\/new$/);
    await expect(
      page.getByText('Season "SSN2526" already exists'),
    ).toBeVisible();

    await page.goto("/seasons");
    await expect(page.getByRole("row", { name: /25\/26/ })).toHaveCount(1);
  });
});
