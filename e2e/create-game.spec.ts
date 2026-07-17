import { expect, test, type Page } from "@playwright/test";

// Tests share the local seeded database, so each test uses a unique
// opponent name unlikely to collide with the seed fixtures
// (seed/data/games.ts) or with each other, rather than asserting on the
// full list contents.
test.describe.configure({ mode: "serial" });

async function readSeasonCount(page: Page, seasonId: string): Promise<number> {
  const heading = await page.getByTestId(`season-${seasonId}`).locator("h2, h3").innerText();
  const match = heading.match(/\((\d+)\)/);
  if (!match) {
    throw new Error(`Could not parse a games-played count from "${heading}"`);
  }
  return Number(match[1]);
}

test.describe("create a game", () => {
  test("valid submission creates a game and lands on its detail page", async ({
    page,
  }) => {
    await page.goto("/games/new");

    await page.getByLabel("Date").fill("2024-11-05");
    await page.getByLabel("Season").selectOption({ label: "23/24" });
    await page.getByLabel("Opponent").fill("E2E Detail Test Opponent");
    await page.getByRole("radio", { name: "LLIHC" }).check();
    await page.getByRole("radio", { name: "Away" }).check();
    await page.getByRole("checkbox", { name: /Jamie Ashworth/ }).check();
    await page.getByRole("checkbox", { name: /Mark Kinnear/ }).check();
    await page.getByRole("button", { name: "Create game" }).click();

    await expect(page).toHaveURL(/\/games\/GME\d+$/);
    await expect(
      page.getByRole("heading", { name: /E2E Detail Test Opponent/ }),
    ).toBeVisible();
    await expect(page.getByText("2024-11-05")).toBeVisible();
    await expect(page.getByText("23/24")).toBeVisible();
    await expect(page.getByText("LLIHC")).toBeVisible();
    await expect(page.getByText("Away")).toBeVisible();
    await expect(page.getByText(/Jamie Ashworth/)).toBeVisible();
    await expect(page.getByText(/Mark Kinnear/)).toBeVisible();
  });

  test("NIHC is not offered as a game type option", async ({ page }) => {
    await page.goto("/games/new");

    await expect(page.getByRole("radio", { name: "NIHC" })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "CHALLENGE" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "BOTBC" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "LLIHC" })).toBeVisible();
  });

  test("inactive players are not offered in the roster picker", async ({
    page,
  }) => {
    await page.goto("/games/new");

    // Sam Elliston, #19, active: false (seed/data/players.ts).
    await expect(
      page.getByRole("checkbox", { name: /Sam Elliston/ }),
    ).toHaveCount(0);
    // Jamie Ashworth, #9, active: true.
    await expect(
      page.getByRole("checkbox", { name: /Jamie Ashworth/ }),
    ).toBeVisible();
  });

  test("creating a game increments that season's games-played count and appears in its list with a 0-0 score", async ({
    page,
  }) => {
    await page.goto("/games");
    const before = await readSeasonCount(page, "SSN2223");

    await page.goto("/games/new");
    await page.getByLabel("Date").fill("2022-12-01");
    await page.getByLabel("Season").selectOption({ label: "22/23" });
    await page.getByLabel("Opponent").fill("Season Count Test Opponent");
    await page.getByRole("checkbox", { name: /Jamie Ashworth/ }).check();
    await page.getByRole("button", { name: "Create game" }).click();
    await expect(page).toHaveURL(/\/games\/GME\d+$/);

    await page.goto("/games");
    const after = await readSeasonCount(page, "SSN2223");
    expect(after).toBe(before + 1);

    const row = page.getByRole("row", { name: /Season Count Test Opponent/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText("0-0");
  });

  test("creating a game increments a rostered player's games-played count for that season", async ({
    page,
  }) => {
    await page.goto("/players");
    await page.getByRole("row", { name: /Jamie Ashworth/ }).click();
    await expect(page).toHaveURL(/\/players\/PLR\d+$/);
    const before = await readSeasonCount(page, "SSN2324");

    await page.goto("/games/new");
    await page.getByLabel("Date").fill("2023-12-01");
    await page.getByLabel("Season").selectOption({ label: "23/24" });
    await page.getByLabel("Opponent").fill("Player Count Test Opponent");
    await page.getByRole("checkbox", { name: /Jamie Ashworth/ }).check();
    await page.getByRole("button", { name: "Create game" }).click();
    await expect(page).toHaveURL(/\/games\/GME\d+$/);

    await page.goto("/players");
    await page.getByRole("row", { name: /Jamie Ashworth/ }).click();
    const after = await readSeasonCount(page, "SSN2324");
    expect(after).toBe(before + 1);

    await expect(
      page.getByRole("row", { name: /Player Count Test Opponent/ }),
    ).toBeVisible();
  });
});
