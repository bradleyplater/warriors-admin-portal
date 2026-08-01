import { expect, test, type Page } from "@playwright/test";

// Creates its own game fixture via /games/new, same isolation approach as
// record-and-edit-goals.spec.ts. Uses Tom Garrity/Liam Hetherington — not
// referenced by any exact-count assertion in another e2e spec — but every
// active player is already rostered in every seeded game (seed/data/games.ts),
// so PIMs are never at a clean zero baseline. Every assertion compares a
// captured "before" value against "after", same as the goals spec.
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

test.describe("record and edit team penalties", () => {
  test("recording a penalty for a rostered player updates their PIMs", async ({
    page,
  }) => {
    const pimsBefore = await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims");

    const gameId = await createTestGame(page, {
      opponentName: "Record Penalty Test Opponent",
      rosterNames: ["Tom Garrity"],
    });

    await page.goto(`/games/${gameId}/penalties/new`);
    await page.getByLabel("Offender").selectOption({ label: "#5 Tom Garrity" });
    await page.getByLabel("Minute", { exact: true }).fill("12");
    await page.getByLabel("Second", { exact: true }).fill("30");
    await page.getByLabel("Type").selectOption({ label: "Tripping" });
    await page.getByLabel("Duration (minutes)").fill("2");
    await page.getByRole("button", { name: "Record penalty" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(
      page.getByText(/12:30.*Tom Garrity.*Tripping.*\(2 min\)/),
    ).toBeVisible();

    expect(
      await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims"),
    ).toBe(pimsBefore + 2);
  });

  test("reassigning a penalty's offender moves PIMs between players", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Reassign Penalty Test Opponent",
      rosterNames: ["Tom Garrity", "Liam Hetherington"],
    });

    await page.goto(`/games/${gameId}/penalties/new`);
    await page.getByLabel("Offender").selectOption({ label: "#5 Tom Garrity" });
    await page.getByLabel("Minute", { exact: true }).fill("8");
    await page.getByLabel("Second", { exact: true }).fill("0");
    await page.getByLabel("Duration (minutes)").fill("2");
    await page.getByRole("button", { name: "Record penalty" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));

    const tomPimsBefore = await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims");
    const liamPimsBefore = await seasonStat(page, "Liam Hetherington", "season-SSN2324", "stat-pims");

    await page.goto(`/games/${gameId}`);
    await page.getByRole("link", { name: "Edit penalty" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}/penalties/PEN\\d+/edit$`));
    await page.getByLabel("Offender").selectOption({ label: "#6 Liam Hetherington" });
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/8:00.*Liam Hetherington/)).toBeVisible();

    expect(
      await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims"),
    ).toBe(tomPimsBefore - 2);
    expect(
      await seasonStat(page, "Liam Hetherington", "season-SSN2324", "stat-pims"),
    ).toBe(liamPimsBefore + 2);
  });

  test("deleting a penalty removes it and reverts the offender's PIMs", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Delete Penalty Test Opponent",
      rosterNames: ["Tom Garrity"],
    });

    await page.goto(`/games/${gameId}/penalties/new`);
    await page.getByLabel("Offender").selectOption({ label: "#5 Tom Garrity" });
    await page.getByLabel("Minute", { exact: true }).fill("40");
    await page.getByLabel("Second", { exact: true }).fill("15");
    await page.getByLabel("Duration (minutes)").fill("4");
    await page.getByRole("button", { name: "Record penalty" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/40:15/)).toBeVisible();

    const pimsBefore = await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims");

    await page.goto(`/games/${gameId}`);
    await page.getByRole("button", { name: "Delete penalty" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/40:15/)).toHaveCount(0);
    expect(
      await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims"),
    ).toBe(pimsBefore - 4);
  });

  test("a bench penalty is visible on the game but does not affect any individual player's PIMs", async ({
    page,
  }) => {
    const pimsBefore = await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims");

    const gameId = await createTestGame(page, {
      opponentName: "Bench Penalty Test Opponent",
      rosterNames: ["Tom Garrity"],
    });

    await page.goto(`/games/${gameId}/penalties/new`);
    await page.getByLabel("Offender").selectOption({ label: "Bench" });
    await page.getByLabel("Minute", { exact: true }).fill("18");
    await page.getByLabel("Second", { exact: true }).fill("0");
    await page.getByLabel("Type").selectOption({ label: "Too Many Men" });
    await page.getByLabel("Duration (minutes)").fill("2");
    await page.getByRole("button", { name: "Record penalty" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(
      page.getByText(/18:00.*Bench.*Too Many Men.*\(2 min\)/),
    ).toBeVisible();

    // Bench penalties count toward the team's PIMs only — no page displays a
    // team total (deliberately deferred, see design.md), so the observable
    // assertion here is the negative case: no individual player is affected.
    expect(
      await seasonStat(page, "Tom Garrity", "season-SSN2324", "stat-pims"),
    ).toBe(pimsBefore);
  });
});
