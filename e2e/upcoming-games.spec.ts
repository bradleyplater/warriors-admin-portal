import { expect, test, type Page } from "@playwright/test";
import { ensureOpponent } from "./support/opponents";

// The local database persists between runs, so the opponent gets a per-run
// suffix and each test finds its own game by that name. Dates are far in
// the future so the game always lands in the Upcoming section.
const RUN = Date.now().toString(36);

function gameLink(page: Page, opponent: string, date: string) {
  return page.getByRole("link", {
    name: `Edit game against ${opponent} on ${date}`,
    exact: true,
  });
}

test.describe("upcoming games", () => {
  test("create an away game, change it to home, then delete it", async ({ page }) => {
    const opponent = `Upcoming Test Opponent ${RUN}`;
    const date = "2099-10-03";
    await ensureOpponent(page, opponent);

    await page.goto("/upcoming-games/new");
    await expect(page.getByLabel("Venue")).toHaveCount(0);

    await page.getByLabel("Opponent").selectOption({ label: opponent });
    await page.getByLabel("Date").fill(date);
    await page.getByLabel("Face-off").fill("20:30");
    await page.getByLabel("Away").check();
    await page.getByLabel("Competition").selectOption({ label: "Challenge" });

    // Away needs a venue — the error keeps everything already entered.
    await page.getByRole("button", { name: "Add upcoming game" }).click();
    await expect(page.getByText("Venue is required for away games").first()).toBeVisible();
    await expect(page.getByLabel("Date")).toHaveValue(date);
    await expect(page.getByLabel("Away")).toBeChecked();

    await page.getByLabel("Venue").fill("Riverside Leisure Centre");
    await page.getByRole("button", { name: "Add upcoming game" }).click();
    await expect(page).toHaveURL(/\/upcoming-games$/);

    const upcoming = page.getByTestId("upcoming-section");
    const row = upcoming.getByRole("row").filter({ has: gameLink(page, opponent, date) });
    await expect(row).toContainText("8:30 PM");
    await expect(row).toContainText("Away, Riverside Leisure Centre");
    await expect(row).toContainText("Challenge");

    // Switching to home drops the venue.
    await gameLink(page, opponent, date).click();
    await expect(page.getByLabel("Venue")).toHaveValue("Riverside Leisure Centre");
    await page.getByLabel("Home").check();
    await expect(page.getByLabel("Venue")).toHaveCount(0);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/upcoming-games$/);
    await expect(row).toContainText("Home");
    await expect(row).not.toContainText("Riverside");

    await gameLink(page, opponent, date).click();
    await page.getByRole("button", { name: "Delete upcoming game" }).click();
    await expect(page).toHaveURL(/\/upcoming-games$/);
    await expect(gameLink(page, opponent, date)).toHaveCount(0);
  });

  test("past games are listed separately", async ({ page }) => {
    // The seed always includes one game dated a week before the seed day.
    await page.goto("/upcoming-games");
    await expect(page.getByTestId("past-section")).toContainText("Ice Hawks");
  });
});
