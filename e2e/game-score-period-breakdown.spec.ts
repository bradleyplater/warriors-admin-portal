import { expect, test, type Page } from "@playwright/test";

// Creates its own game fixture via /games/new, same isolation approach as
// record-and-edit-goals.spec.ts. Uses Chris Norbury — only one rostered
// player is needed since these assertions are about the game-scoped period
// breakdown/shootout display, not any player's season stats, so there's no
// cross-spec stat race to guard against here.
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

async function recordTeamGoal(
  page: Page,
  gameId: string,
  { minute, type }: { minute: number; type: string },
): Promise<void> {
  await page.goto(`/games/${gameId}/goals/new`);
  await page.getByLabel("Scorer").selectOption({ label: "#8 Chris Norbury" });
  await page.getByLabel("Minute").fill(String(minute));
  await page.getByLabel("Second").fill("0");
  await page.getByLabel("Type").selectOption({ label: type });
  await page.getByRole("button", { name: "Record goal" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
}

async function recordOpponentGoal(
  page: Page,
  gameId: string,
  { minute, type }: { minute: number; type: string },
): Promise<void> {
  await page.goto(`/games/${gameId}/opponent-goals/new`);
  await page.getByLabel("Scorer").fill("Rival Scorer");
  await page.getByLabel("Minute").fill(String(minute));
  await page.getByLabel("Second").fill("0");
  await page.getByLabel("Type").selectOption({ label: type });
  await page.getByRole("button", { name: "Record goal" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
}

test.describe("game detail page shows the derived score and period breakdown", () => {
  test("regulation goals are bucketed into the correct period, and shootout goals are shown separately", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Period Breakdown Test Opponent",
      rosterNames: ["Chris Norbury"],
    });

    await recordTeamGoal(page, gameId, { minute: 5, type: "Even Strength" });
    await recordTeamGoal(page, gameId, { minute: 25, type: "Power Play" });
    await recordOpponentGoal(page, gameId, { minute: 45, type: "Even Strength" });

    await expect(page.getByTestId("period-1-team")).toHaveText("1");
    await expect(page.getByTestId("period-2-team")).toHaveText("1");
    await expect(page.getByTestId("period-3-team")).toHaveText("0");
    await expect(page.getByTestId("period-1-opponent")).toHaveText("0");
    await expect(page.getByTestId("period-2-opponent")).toHaveText("0");
    await expect(page.getByTestId("period-3-opponent")).toHaveText("1");
    await expect(page.getByRole("heading", { name: /— 2-1$/ })).toBeVisible();
    await expect(page.getByTestId("shootout-note")).toHaveCount(0);

    // Shootout goals are excluded from every period and shown as a
    // separate result, with the shootout winner's total getting the +1.
    await recordTeamGoal(page, gameId, { minute: 0, type: "Shootout" });
    await recordTeamGoal(page, gameId, { minute: 0, type: "Shootout" });
    await recordOpponentGoal(page, gameId, { minute: 0, type: "Shootout" });

    await expect(page.getByTestId("period-1-team")).toHaveText("1");
    await expect(page.getByTestId("period-1-opponent")).toHaveText("0");
    await expect(page.getByRole("heading", { name: /— 3-1$/ })).toBeVisible();
    await expect(page.getByTestId("shootout-note")).toHaveText(
      "Decided by shootout — Team won 2-1",
    );
  });

  test("editing a goal's minute moves it to a different period, and deleting it clears the period", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Move Period Test Opponent",
      rosterNames: ["Chris Norbury"],
    });

    await recordTeamGoal(page, gameId, { minute: 5, type: "Even Strength" });
    await expect(page.getByTestId("period-1-team")).toHaveText("1");
    await expect(page.getByTestId("period-3-team")).toHaveText("0");

    await page.goto(`/games/${gameId}`);
    await page.getByRole("link", { name: "Edit goal" }).click();
    await page.getByLabel("Minute").fill("50");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));

    await expect(page.getByTestId("period-1-team")).toHaveText("0");
    await expect(page.getByTestId("period-3-team")).toHaveText("1");

    await page.getByRole("button", { name: "Delete goal" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByTestId("period-3-team")).toHaveText("0");
    await expect(page.getByRole("heading", { name: /— 0-0$/ })).toBeVisible();
  });
});
