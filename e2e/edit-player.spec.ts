import { expect, test } from "@playwright/test";

// Each test creates its own player via /players/new rather than editing the
// seed fixtures, so the shared local database stays stable across other
// specs run in the same suite.
test.describe.configure({ mode: "serial" });

async function createTestPlayer(
  page: import("@playwright/test").Page,
  { firstName, surname, number }: { firstName: string; surname: string; number: string },
) {
  await page.goto("/players/new");
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Surname").fill(surname);
  await page.getByLabel("Shirt number").fill(number);
  await page.getByRole("checkbox", { name: "Forward" }).check();
  await page.getByRole("button", { name: "Create player" }).click();
  await expect(page).toHaveURL(/\/players$/);
}

test.describe("edit and deactivate a player", () => {
  test("editing a field updates the roster list", async ({ page }) => {
    await createTestPlayer(page, {
      firstName: "Editable",
      surname: "Player",
      number: "63",
    });

    const row = page.getByRole("row", { name: /Editable Player/ });
    await row.getByRole("link", { name: /Edit/ }).click();

    await expect(page).toHaveURL(/\/players\/PLR\d{6}\/edit$/);
    await expect(page.getByLabel("First name")).toHaveValue("Editable");

    await page.getByLabel("Nickname (optional)").fill("Eddie");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/players$/);
    await expect(
      page.getByRole("row", { name: /Editable Player/ }),
    ).toContainText("Eddie");
  });

  test("invalid edit is rejected with the same validation as creation", async ({
    page,
  }) => {
    await createTestPlayer(page, {
      firstName: "Invalid",
      surname: "Edit",
      number: "64",
    });

    const row = page.getByRole("row", { name: /Invalid Edit/ });
    await row.getByRole("link", { name: /Edit/ }).click();

    await page.getByLabel("Shirt number").fill("0");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/players\/PLR\d{6}\/edit$/);
    await expect(
      page.getByText("Number must be between 1 and 99"),
    ).toBeVisible();
  });

  test("deactivating a player moves them to the Inactive section, and their number becomes reusable", async ({
    page,
  }) => {
    await createTestPlayer(page, {
      firstName: "Deactivate",
      surname: "Me",
      number: "65",
    });

    const activeSection = page.getByTestId("active-section");
    const inactiveSection = page.getByTestId("inactive-section");

    await activeSection
      .getByRole("row", { name: /Deactivate Me/ })
      .getByRole("link", { name: /Edit/ })
      .click();

    await page.getByRole("checkbox", { name: "Active" }).uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/players$/);
    await expect(
      inactiveSection.getByRole("row", { name: /Deactivate Me/ }),
    ).toBeVisible();
    await expect(
      activeSection.getByRole("row", { name: /Deactivate Me/ }),
    ).toHaveCount(0);

    // #65 is now free — another active player can take it.
    await createTestPlayer(page, {
      firstName: "Reuses",
      surname: "Number",
      number: "65",
    });
    await expect(
      activeSection.getByRole("row", { name: /Reuses Number/ }),
    ).toContainText("65");
  });

  test("reactivating into a number held by another active player is blocked", async ({
    page,
  }) => {
    // #9 is Jamie Ashworth, active: true, in seed/data/players.ts.
    await createTestPlayer(page, {
      firstName: "Blocked",
      surname: "Reactivate",
      number: "66",
    });

    const inactiveSection = page.getByTestId("inactive-section");
    await page
      .getByRole("row", { name: /Blocked Reactivate/ })
      .getByRole("link", { name: /Edit/ })
      .click();
    await page.getByRole("checkbox", { name: "Active" }).uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/players$/);
    await expect(
      inactiveSection.getByRole("row", { name: /Blocked Reactivate/ }),
    ).toBeVisible();

    await inactiveSection
      .getByRole("row", { name: /Blocked Reactivate/ })
      .getByRole("link", { name: /Edit/ })
      .click();
    await page.getByLabel("Shirt number").fill("9");
    await page.getByRole("checkbox", { name: "Active" }).check();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/players\/PLR\d{6}\/edit$/);
    await expect(
      page.getByText("An active player with number 9 already exists"),
    ).toBeVisible();
  });
});
