import { expect, test, type Page } from "@playwright/test";

// Editing-details and roster-add/remove tests create their own game fixture
// via /games/new, same as create-game.spec.ts, so the shared local database
// stays stable across other specs. They roster Mark Kinnear/Callum Baxter,
// not Jamie Ashworth — player-profile.spec.ts asserts Jamie Ashworth's
// games-played counts are exact per season, and other spec files run in
// parallel with this one, so touching his roster membership anywhere would
// make that assertion flaky. The blocked-removal test is the one exception
// to "create your own fixture" — no goal/penalty-entry UI exists yet, so it
// has to exercise the seeded game GME100001 (seed/data/games.ts), which
// already has goals, a penalty, and awards referencing seeded players. It
// only ever attempts to remove Jamie Ashworth (which is blocked, so he's
// never actually taken off the roster) and restores the one safe removal
// (Ben Jephcott) it makes, so the shared fixture is unchanged afterward.
test.describe.configure({ mode: "serial" });

async function createTestGame(
  page: Page,
  {
    opponentName,
    rosterNames,
  }: { opponentName: string; rosterNames: string[] },
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

test.describe("edit game details", () => {
  test("editing details updates the game and redirects to its detail page", async ({
    page,
  }) => {
    await createTestGame(page, {
      opponentName: "Edit Details Test Opponent",
      rosterNames: ["Mark Kinnear"],
    });

    await page.getByRole("link", { name: "Edit details" }).click();
    await expect(page).toHaveURL(/\/games\/GME\d+\/edit$/);
    await expect(page.getByLabel("Opponent")).toHaveValue(
      "Edit Details Test Opponent",
    );

    await page.getByLabel("Opponent").fill("Renamed Opponent");
    await page.getByLabel("Date").fill("2024-02-20");
    await page.getByRole("radio", { name: "LLIHC" }).check();
    await page.getByRole("radio", { name: "Away" }).check();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/games\/GME\d+$/);
    await expect(
      page.getByRole("heading", { name: /Renamed Opponent/ }),
    ).toBeVisible();
    await expect(page.getByText("2024-02-20")).toBeVisible();
    await expect(page.getByText("LLIHC")).toBeVisible();
    await expect(page.getByText("Away")).toBeVisible();
  });

  test("invalid edit is rejected with the same validation as creation", async ({
    page,
  }) => {
    await createTestGame(page, {
      opponentName: "Invalid Edit Test Opponent",
      rosterNames: ["Mark Kinnear"],
    });

    await page.getByRole("link", { name: "Edit details" }).click();
    await page.getByLabel("Opponent").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/games\/GME\d+\/edit$/);
    await expect(page.getByText(/too small|required|empty/i)).toBeVisible();
  });
});

test.describe("manage roster", () => {
  test("adding a player updates the game and that player's games-played count", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Add Roster Test Opponent",
      rosterNames: ["Mark Kinnear"],
    });

    await page.goto("/players");
    await page.getByRole("row", { name: /Callum Baxter/ }).click();
    await expect(page).toHaveURL(/\/players\/PLR\d+$/);
    const before = await page
      .getByTestId("season-SSN2324")
      .locator("h3")
      .innerText();

    await page.goto(`/games/${gameId}/roster`);
    await page.getByRole("checkbox", { name: /Callum Baxter/ }).check();
    await page.getByRole("button", { name: "Save roster" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/Callum Baxter/)).toBeVisible();

    await page.goto("/players");
    await page.getByRole("row", { name: /Callum Baxter/ }).click();
    const after = await page
      .getByTestId("season-SSN2324")
      .locator("h3")
      .innerText();
    expect(after).not.toBe(before);
  });

  test("removing an unreferenced player updates the game and that player's games-played count", async ({
    page,
  }) => {
    const gameId = await createTestGame(page, {
      opponentName: "Remove Roster Test Opponent",
      rosterNames: ["Mark Kinnear", "Callum Baxter"],
    });

    await page.goto("/players");
    await page.getByRole("row", { name: /Callum Baxter/ }).click();
    const before = await page
      .getByTestId("season-SSN2324")
      .locator("h3")
      .innerText();

    await page.goto(`/games/${gameId}/roster`);
    await page.getByRole("checkbox", { name: /Callum Baxter/ }).uncheck();
    await page.getByRole("button", { name: "Save roster" }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}$`));
    await expect(page.getByText(/Callum Baxter/)).toHaveCount(0);

    await page.goto("/players");
    await page.getByRole("row", { name: /Callum Baxter/ }).click();
    const after = await page
      .getByTestId("season-SSN2324")
      .locator("h3")
      .innerText();
    expect(after).not.toBe(before);
  });

  test("removing a player still referenced by a goal is blocked, while an unreferenced removal in the same submission still applies", async ({
    page,
  }) => {
    // GME100001 (seed/data/games.ts): PLR100001 "Jamie Ashworth" (#9)
    // scored a goal with no assists/penalties/awards attached to him;
    // PLR100010 "Ben Jephcott" (#27) is rostered but not referenced
    // anywhere in this game. The restore step runs in `finally` so a
    // failed assertion above can't leave the shared seed fixture missing
    // Ben Jephcott for other specs/runs.
    try {
      await page.goto("/games/GME100001/roster");

      const jamieCheckbox = page.getByRole("checkbox", {
        name: /Jamie Ashworth/,
      });
      const benCheckbox = page.getByRole("checkbox", { name: /Ben Jephcott/ });
      await expect(jamieCheckbox).toBeChecked();
      await expect(benCheckbox).toBeChecked();

      await jamieCheckbox.uncheck();
      await benCheckbox.uncheck();
      await page.getByRole("button", { name: "Save roster" }).click();

      // Blocked removal stays on the roster page rather than redirecting.
      await expect(page).toHaveURL(/\/games\/GME100001\/roster$/);
      const blockedMessage = page.getByText(/Jamie Ashworth can't be removed/);
      await expect(blockedMessage).toBeVisible();
      await expect(blockedMessage).toContainText("1 goal");

      // The blocked player is still on the roster; the unreferenced one was
      // still removed as part of the same submission.
      await expect(
        page.getByRole("checkbox", { name: /Jamie Ashworth/ }),
      ).toBeChecked();
      await expect(
        page.getByRole("checkbox", { name: /Ben Jephcott/ }),
      ).not.toBeChecked();
    } finally {
      // Restore the seed fixture's original roster for other specs. `check()`
      // is a no-op if Ben Jephcott is already checked, so this is safe to run
      // regardless of how far the block above got.
      await page.goto("/games/GME100001/roster");
      await page.getByRole("checkbox", { name: /Ben Jephcott/ }).check();
      await page.getByRole("button", { name: "Save roster" }).click();
    }
  });
});
