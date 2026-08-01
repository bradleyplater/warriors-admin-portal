import { expect, test, type Page } from "@playwright/test";

// Creates its own game fixture via /games/new, same isolation approach as
// record-and-edit-goals.spec.ts / record-and-edit-penalties.spec.ts. Uses
// Jamie Ashworth — not referenced by any exact-count assertion in another
// e2e spec — but every active player is already rostered in every seeded
// game (seed/data/games.ts), so stats are never at a clean zero baseline.
// Every stat assertion here compares a captured "before" value against
// "after", same as the team goals/penalties specs, rather than an absolute
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

test.describe("record and edit opponent goals and penalties", () => {
  test("recording, editing, and deleting an opponent goal updates the score without touching any Warriors player's stats", async ({
    page,
  }) => {
    const goalsBefore = await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-goals");
    const pointsBefore = await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-points");

    const gameId = await createTestGame(page, {
      opponentName: "Opponent Goal Test Opponent",
      rosterNames: ["Jamie Ashworth"],
    });

    await page.goto(`/games/${gameId}/opponent-goals/new`);
    await page.getByLabel("Scorer").fill("J. Rival");
    await page.getByLabel("Minute").fill("10");
    await page.getByLabel("Second").fill("15");
    await page.getByLabel("Type").selectOption({ label: "Even Strength" });
    await page.getByRole("button", { name: "Record goal" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/10:15.*J\. Rival.*Even Strength/)).toBeVisible();
    // Score derived from opponentTeam.goals — opponent side is now 1.
    await expect(page.getByRole("heading", { name: /— 0-1$/ })).toBeVisible();

    expect(
      await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-goals"),
    ).toBe(goalsBefore);
    expect(
      await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-points"),
    ).toBe(pointsBefore);

    // The games list row also reflects the derived score.
    await page.goto("/games");
    await expect(
      page.getByRole("row", { name: /Opponent Goal Test Opponent/ }),
    ).toContainText("0-1");

    await page.goto(`/games/${gameId}`);
    await page.getByRole("link", { name: "Edit opponent goal" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}/opponent-goals/OGL\\d+/edit$`));
    await page.getByLabel("Scorer").fill("A. Rival");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/10:15.*A\. Rival/)).toBeVisible();

    await page.goto(`/games/${gameId}`);
    await page.getByRole("button", { name: "Delete opponent goal" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/A\. Rival/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /— 0-0$/ })).toBeVisible();

    expect(
      await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-goals"),
    ).toBe(goalsBefore);
    expect(
      await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-points"),
    ).toBe(pointsBefore);
  });

  test("recording, editing, and deleting an opponent penalty does not touch any Warriors player's PIMs", async ({
    page,
  }) => {
    const pimsBefore = await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-pims");

    const gameId = await createTestGame(page, {
      opponentName: "Opponent Penalty Test Opponent",
      rosterNames: ["Jamie Ashworth"],
    });

    await page.goto(`/games/${gameId}/opponent-penalties/new`);
    await page.getByLabel("Offender").fill("J. Rival");
    await page.getByLabel("Minute", { exact: true }).fill("12");
    await page.getByLabel("Second", { exact: true }).fill("30");
    await page.getByLabel("Type").selectOption({ label: "Tripping" });
    await page.getByLabel("Duration (minutes)").fill("2");
    await page.getByRole("button", { name: "Record penalty" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(
      page.getByText(/12:30.*J\. Rival.*Tripping.*\(2 min\)/),
    ).toBeVisible();

    expect(
      await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-pims"),
    ).toBe(pimsBefore);

    await page.goto(`/games/${gameId}`);
    await page.getByRole("link", { name: "Edit opponent penalty" }).click();
    await expect(
      page,
    ).toHaveURL(new RegExp(`/games/${gameId}/opponent-penalties/OPP\\d+/edit$`));
    await page.getByLabel("Offender").fill("A. Rival");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/12:30.*A\. Rival/)).toBeVisible();

    await page.goto(`/games/${gameId}`);
    await page.getByRole("button", { name: "Delete opponent penalty" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/A\. Rival/)).toHaveCount(0);

    expect(
      await seasonStat(page, "Jamie Ashworth", "season-SSN2324", "stat-pims"),
    ).toBe(pimsBefore);
  });
});
