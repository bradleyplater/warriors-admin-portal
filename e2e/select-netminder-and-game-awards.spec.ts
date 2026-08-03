import { expect, test, type Page } from "@playwright/test";

// Creates its own game fixture via /games/new, same isolation approach as
// record-and-edit-goals.spec.ts. Uses Chris Norbury/Danny Osgood/Will
// Pargeter — not referenced by any exact-count assertion in another e2e
// spec, and (unlike the Player of the Game/Warrior of the Game fields
// exercised here) no other spec sets awards via the UI, so there's no
// cross-spec race on their award counts. Every active player is already
// rostered in every seeded game (seed/data/games.ts), so season stats are
// never at a clean zero baseline — assertions compare a captured "before"
// value against "after", same as the delta checks in
// record-and-edit-goals.spec.ts, rather than an absolute total.
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

test.describe("select netminder and game awards", () => {
  test("setting and clearing the netminder is a game detail, not an award", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Netminder Test Opponent",
      rosterNames: ["Chris Norbury"],
    });

    await expect(page.locator("dt:text-is('Netminder') + dd")).toHaveText(
      "Not set",
    );
    // Netminder isn't an award — there's no "Manage awards" select for it.
    await page.getByRole("link", { name: "Manage awards" }).click();
    await expect(page.getByLabel("Netminder")).toHaveCount(0);

    await page.goto(`/games/${gameId}/edit`);
    await page.getByLabel("Netminder").selectOption({ label: "#8 Chris Norbury" });
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.locator("dt:text-is('Netminder') + dd")).toHaveText(
      "#8 Chris Norbury",
    );

    await page.goto(`/games/${gameId}/edit`);
    await page.getByLabel("Netminder").selectOption({ label: "None" });
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.locator("dt:text-is('Netminder') + dd")).toHaveText(
      "Not set",
    );
  });

  test("setting, reassigning, and clearing awards updates the game page and moves derived season counts", async ({
    page,
  }) => {
    const potgBefore = {
      osgood: await seasonStat(page, "Danny Osgood", "season-SSN2324", "stat-man-of-the-match"),
      pargeter: await seasonStat(page, "Will Pargeter", "season-SSN2324", "stat-man-of-the-match"),
    };
    const wotgBefore = await seasonStat(
      page,
      "Will Pargeter",
      "season-SSN2324",
      "stat-warrior-of-the-game",
    );

    const gameId = await createTestGame(page, {
      opponentName: "Awards Test Opponent",
      rosterNames: ["Danny Osgood", "Will Pargeter"],
    });

    // Before any award is set, the game page shows "Not set" for both.
    await expect(
      page.locator("dt:text-is('Player of the Game') + dd"),
    ).toHaveText("Not set");
    await expect(
      page.locator("dt:text-is('Warrior of the Game') + dd"),
    ).toHaveText("Not set");

    // Set both awards.
    await page.getByRole("link", { name: "Manage awards" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}/awards$`));
    await page
      .getByLabel("Player of the Game")
      .selectOption({ label: "#21 Danny Osgood" });
    await page
      .getByLabel("Warrior of the Game")
      .selectOption({ label: "#3 Will Pargeter" });
    await page.getByRole("button", { name: "Save awards" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(
      page.locator("dt:text-is('Player of the Game') + dd"),
    ).toHaveText("#21 Danny Osgood");
    await expect(
      page.locator("dt:text-is('Warrior of the Game') + dd"),
    ).toHaveText("#3 Will Pargeter");

    expect(
      await seasonStat(page, "Danny Osgood", "season-SSN2324", "stat-man-of-the-match"),
    ).toBe(potgBefore.osgood + 1);

    // Reassign Player of the Game from Danny Osgood to Will Pargeter — the
    // count should move, not just increment the new holder.
    await page.goto(`/games/${gameId}/awards`);
    await page
      .getByLabel("Player of the Game")
      .selectOption({ label: "#3 Will Pargeter" });
    await page.getByRole("button", { name: "Save awards" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(
      page.locator("dt:text-is('Player of the Game') + dd"),
    ).toHaveText("#3 Will Pargeter");

    expect(
      await seasonStat(page, "Danny Osgood", "season-SSN2324", "stat-man-of-the-match"),
    ).toBe(potgBefore.osgood);
    expect(
      await seasonStat(page, "Will Pargeter", "season-SSN2324", "stat-man-of-the-match"),
    ).toBe(potgBefore.pargeter + 1);

    // Clear Warrior of the Game — the count returns to its pre-test value
    // and the game page shows "Not set" again.
    await page.goto(`/games/${gameId}/awards`);
    await page.getByLabel("Warrior of the Game").selectOption({ label: "None" });
    await page.getByRole("button", { name: "Save awards" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(
      page.locator("dt:text-is('Warrior of the Game') + dd"),
    ).toHaveText("Not set");

    expect(
      await seasonStat(page, "Will Pargeter", "season-SSN2324", "stat-warrior-of-the-game"),
    ).toBe(wotgBefore);
  });
});
