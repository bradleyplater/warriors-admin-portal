import { expect, test } from "@playwright/test";

test.describe("portal shell", () => {
  test("home page renders", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Warriors Admin Portal" }),
    ).toBeVisible();
  });

  test("navigates to Players, Games, and Seasons", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Players" }).click();
    await expect(page).toHaveURL(/\/players$/);
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();

    await page.getByRole("link", { name: "Games" }).click();
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.getByRole("heading", { name: "Games" })).toBeVisible();

    await page.getByRole("link", { name: "Seasons" }).click();
    await expect(page).toHaveURL(/\/seasons$/);
    await expect(page.getByRole("heading", { name: "Seasons" })).toBeVisible();
  });
});
