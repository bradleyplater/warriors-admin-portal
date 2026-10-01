import { expect, test } from "@playwright/test";

// Uses the seeded seasons (seed/data/seasons.ts flags 25/26 active) and puts
// 25/26 back at the end, so other specs still see the seeded active season.
test.describe.configure({ mode: "serial" });

test.describe("active season", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/seasons");
    const restore = page.getByRole("button", { name: "Set 25/26 active" });
    if (await restore.isVisible()) {
      await restore.click();
      await expect(page.getByRole("row", { name: /25\/26/ }).getByTestId("active-season")).toBeVisible();
    }
    await page.close();
  });

  test("setting a season active moves the badge and flags unpublished changes", async ({
    page,
  }) => {
    await page.goto("/seasons");

    const current = page.getByRole("row", { name: /25\/26/ });
    const target = page.getByRole("row", { name: /24\/25/ });
    await expect(current.getByTestId("active-season")).toHaveText(/^✓?Active$/);

    await target.getByRole("button", { name: "Set 24/25 active" }).click();

    await expect(target.getByTestId("active-season")).toHaveText(/^✓?Active$/);
    await expect(current.getByRole("button", { name: "Set 25/26 active" })).toBeVisible();
    await expect(page.getByTestId("active-season")).toHaveCount(1);

    const status = page.getByTestId("publish-status");
    await expect(status).toHaveAttribute("data-state", "unpublished");
  });
});
