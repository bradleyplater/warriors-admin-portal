import { expect, test } from "@playwright/test";

// Tests share the local seeded database, so each test uses a shirt number
// unlikely to collide with the seed fixtures (seed/data/players.ts) or with
// each other, rather than asserting on the full list contents.
test.describe.configure({ mode: "serial" });

test.describe("create a player", () => {
  test("valid submission creates a player and it appears in the list", async ({
    page,
  }) => {
    await page.goto("/players");

    await page.getByLabel("First name").fill("Testy");
    await page.getByLabel("Surname").fill("McTestface");
    await page.getByLabel("Shirt number").fill("61");
    await page.getByRole("checkbox", { name: "Forward" }).check();
    await page.getByRole("button", { name: "Create player" }).click();

    await expect(page.getByText("Player created.")).toBeVisible();
    await expect(page.getByText("Testy McTestface — #61")).toBeVisible();
  });

  test("non-numeric shirt number is rejected", async ({ page }) => {
    await page.goto("/players");

    await page.getByLabel("First name").fill("Bad");
    await page.getByLabel("Surname").fill("Number");
    await page.getByLabel("Shirt number").fill("abc");
    await page.getByRole("checkbox", { name: "Forward" }).check();
    await page.getByRole("button", { name: "Create player" }).click();

    await expect(
      page.getByText("Number must be between 1 and 99"),
    ).toBeVisible();
    await expect(page.getByText("Bad Number — #")).toHaveCount(0);
  });

  test("out-of-range shirt number is rejected", async ({ page }) => {
    await page.goto("/players");

    await page.getByLabel("First name").fill("Out");
    await page.getByLabel("Surname").fill("OfRange");
    await page.getByLabel("Shirt number").fill("100");
    await page.getByRole("checkbox", { name: "Forward" }).check();
    await page.getByRole("button", { name: "Create player" }).click();

    await expect(
      page.getByText("Number must be between 1 and 99"),
    ).toBeVisible();
    await expect(page.getByText("Out OfRange — #")).toHaveCount(0);
  });

  test("no position selected is rejected", async ({ page }) => {
    await page.goto("/players");

    await page.getByLabel("First name").fill("No");
    await page.getByLabel("Surname").fill("Position");
    await page.getByLabel("Shirt number").fill("62");
    await page.getByRole("button", { name: "Create player" }).click();

    await expect(
      page.getByText("At least one position is required"),
    ).toBeVisible();
    await expect(page.getByText("No Position — #")).toHaveCount(0);
  });

  test("duplicate active shirt number is rejected", async ({ page }) => {
    // #9 is Jamie Ashworth, active: true, in seed/data/players.ts.
    await page.goto("/players");

    await page.getByLabel("First name").fill("Duplicate");
    await page.getByLabel("Surname").fill("Number");
    await page.getByLabel("Shirt number").fill("9");
    await page.getByRole("checkbox", { name: "Forward" }).check();
    await page.getByRole("button", { name: "Create player" }).click();

    await expect(
      page.getByText("An active player with number 9 already exists"),
    ).toBeVisible();
    await expect(page.getByText("Duplicate Number — #")).toHaveCount(0);
  });
});
