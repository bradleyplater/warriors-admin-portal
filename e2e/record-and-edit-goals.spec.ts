import { expect, test, type Page } from "@playwright/test";

// Creates its own game fixture via /games/new, same isolation approach as
// edit-game-and-manage-roster.spec.ts. Uses Dean Crosbie/Ollie Dunmore —
// not referenced by any exact-count assertion in another e2e spec — but
// every active player (including these two) is already rostered in every
// seeded game (seed/data/games.ts), so their season stats are never at a
// clean zero baseline. Every assertion here compares a captured "before"
// value against "after", exactly like the games-played delta checks in
// edit-game-and-manage-roster.spec.ts, rather than asserting an absolute
// total.
test.describe.configure({ mode: "serial" });

async function createTestGame(
  page: Page,
  { opponentName, rosterNames }: { opponentName: string; rosterNames: string[] },
): Promise<string> {
  await page.goto("/games/new");
  await page.getByLabel("Date").fill("2024-01-15");
  await page.getByLabel("Season").selectOption({ label: "23/24" });
  await page.getByLabel("Opponent").fill(opponentName);
  for (const name of rosterNames) {
    await page.getByRole("checkbox", { name: new RegExp(name) }).check();
  }
  await page.getByRole("button", { name: "Create game" }).click();
  await expect(page).toHaveURL(/\/games\/GME\d+$/);
  return page.url().split("/games/")[1];
}

async function seasonStat(
  page: Page,
  playerName: string,
  seasonTestId: string,
  statTestId: string,
): Promise<number> {
  await page.goto("/players");
  await page.getByRole("row", { name: new RegExp(playerName) }).click();
  const text = await page
    .getByTestId(seasonTestId)
    .getByTestId(statTestId)
    .innerText();
  return Number(text);
}

test.describe("record and edit team goals", () => {
  test("recording a goal updates the scorer's and assister's goals/assists/points", async ({
    page,
  }) => {
    const goalsBefore = await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-goals");
    const pointsBefore = await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-points");
    const assistsBefore = await seasonStat(page, "Ollie Dunmore", "season-SSN2324", "stat-assists");

    const gameId = await createTestGame(page, {
      opponentName: "Record Goal Test Opponent",
      rosterNames: ["Dean Crosbie", "Ollie Dunmore"],
    });

    await page.goto(`/games/${gameId}/goals/new`);
    await page.getByLabel("Scorer").selectOption({ label: "#14 Dean Crosbie" });
    await page.getByLabel("Assist 1").selectOption({ label: "#17 Ollie Dunmore" });
    await page.getByLabel("Minute").fill("10");
    await page.getByLabel("Second").fill("15");
    await page.getByLabel("Type").selectOption({ label: "Even Strength" });
    await page.getByRole("button", { name: "Record goal" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/10:15.*Dean Crosbie.*Ollie Dunmore.*Even Strength/)).toBeVisible();

    expect(
      await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-goals"),
    ).toBe(goalsBefore + 1);
    expect(
      await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-points"),
    ).toBe(pointsBefore + 1);
    expect(
      await seasonStat(page, "Ollie Dunmore", "season-SSN2324", "stat-assists"),
    ).toBe(assistsBefore + 1);
  });

  test("changing a goal's scorer moves the goal and points from the original scorer to the new scorer", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Move Scorer Test Opponent",
      rosterNames: ["Dean Crosbie", "Ollie Dunmore"],
    });

    await page.goto(`/games/${gameId}/goals/new`);
    await page.getByLabel("Scorer").selectOption({ label: "#14 Dean Crosbie" });
    await page.getByLabel("Minute").fill("5");
    await page.getByLabel("Second").fill("0");
    await page.getByRole("button", { name: "Record goal" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));

    const deanGoalsBefore = await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-goals");
    const ollieGoalsBefore = await seasonStat(page, "Ollie Dunmore", "season-SSN2324", "stat-goals");

    await page.goto(`/games/${gameId}`);
    await page.getByRole("link", { name: "Edit goal" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}/goals/GOL\\d+/edit$`));
    await page.getByLabel("Scorer").selectOption({ label: "#17 Ollie Dunmore" });
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/5:00.*Ollie Dunmore/)).toBeVisible();

    expect(
      await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-goals"),
    ).toBe(deanGoalsBefore - 1);
    expect(
      await seasonStat(page, "Ollie Dunmore", "season-SSN2324", "stat-goals"),
    ).toBe(ollieGoalsBefore + 1);
  });

  test("deleting a goal removes it from the game and reverts the scorer's stats", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Delete Goal Test Opponent",
      rosterNames: ["Dean Crosbie"],
    });

    await page.goto(`/games/${gameId}/goals/new`);
    await page.getByLabel("Scorer").selectOption({ label: "#14 Dean Crosbie" });
    await page.getByLabel("Minute").fill("20");
    await page.getByLabel("Second").fill("30");
    await page.getByRole("button", { name: "Record goal" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/20:30/)).toBeVisible();

    const goalsBefore = await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-goals");

    await page.goto(`/games/${gameId}`);
    await page.getByRole("button", { name: "Delete goal" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/20:30/)).toHaveCount(0);
    expect(
      await seasonStat(page, "Dean Crosbie", "season-SSN2324", "stat-goals"),
    ).toBe(goalsBefore - 1);
  });
});
