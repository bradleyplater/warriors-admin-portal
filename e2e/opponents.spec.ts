import { expect, test, type Page } from "@playwright/test";
import { ensureOpponent } from "./support/opponents";

// Opponent names are unique and the local database persists between runs,
// so every opponent a test creates gets a per-run suffix. The seeded
// "Rivals HC" (seed/data/opponents.ts) is only ever used for the blocked
// delete, which by design changes nothing.
const RUN = Date.now().toString(36);

const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
);
// Smallest valid PNG (1x1 transparent).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

async function createOpponent(
  page: Page,
  name: string,
  logo?: { name: string; mimeType: string; buffer: Buffer },
) {
  await page.goto("/opponents/new");
  await page.getByLabel("Name").fill(name);
  if (logo) {
    await page.getByLabel("Logo (optional)").setInputFiles(logo);
  }
  await page.getByRole("button", { name: "Create opponent" }).click();
  await expect(page).toHaveURL(/\/opponents$/);
}

async function openEditPage(page: Page, name: string) {
  await page.goto("/opponents");
  await page.getByRole("link", { name: `Edit ${name}`, exact: true }).click();
  await expect(page).toHaveURL(/\/opponents\/OPN\d+\/edit$/);
}

async function logoSrc(page: Page, name: string): Promise<string> {
  const logo = page.getByRole("img", { name: `${name} logo` });
  await expect(logo).toBeVisible();
  // naturalWidth > 0 means the browser actually loaded and decoded it.
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  return (await logo.getAttribute("src")) ?? "";
}

test.describe("opponents", () => {
  test("creating an opponent with a logo lists it with that logo", async ({
    page,
  }) => {
    const name = `Logo Test Opponent ${RUN}`;
    await createOpponent(page, name, {
      name: "logo.svg",
      mimeType: "image/svg+xml",
      buffer: SVG,
    });

    await expect(
      page.getByRole("link", { name: `Edit ${name}`, exact: true }),
    ).toBeVisible();
    await logoSrc(page, name);
  });

  test("an opponent without a logo shows a placeholder", async ({ page }) => {
    const name = `No Logo Test Opponent ${RUN}`;
    await createOpponent(page, name);

    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row.getByText("No logo", { exact: true })).toBeVisible();
  });

  test("a duplicate name is rejected, ignoring case", async ({ page }) => {
    const name = `Duplicate Test Opponent ${RUN}`;
    await createOpponent(page, name);

    await page.goto("/opponents/new");
    await page.getByLabel("Name").fill(name.toUpperCase());
    await page.getByRole("button", { name: "Create opponent" }).click();

    await expect(page).toHaveURL(/\/opponents\/new$/);
    await expect(page.getByText(/already exists/)).toBeVisible();
  });

  test("an unsupported logo file is rejected", async ({ page }) => {
    await page.goto("/opponents/new");
    await page.getByLabel("Name").fill(`Gif Test Opponent ${RUN}`);
    await page.getByLabel("Logo (optional)").setInputFiles({
      name: "logo.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    });
    await page.getByRole("button", { name: "Create opponent" }).click();

    await expect(page).toHaveURL(/\/opponents\/new$/);
    await expect(
      page.getByText("Logo must be an SVG, PNG, JPEG, or WebP image"),
    ).toBeVisible();
  });

  test("replacing a logo shows the new one", async ({ page }) => {
    const name = `Replace Logo Test Opponent ${RUN}`;
    await createOpponent(page, name, {
      name: "logo.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    const before = await logoSrc(page, name);

    await openEditPage(page, name);
    await page.getByLabel("Replace logo (optional)").setInputFiles({
      name: "logo.svg",
      mimeType: "image/svg+xml",
      buffer: SVG,
    });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/opponents$/);

    const after = await logoSrc(page, name);
    expect(after).not.toBe(before);
    expect(decodeURIComponent(after)).toMatch(/\.svg$/);
  });

  test("renaming an opponent renames it on the games that reference it", async ({
    page,
  }) => {
    const name = `Rename Test Opponent ${RUN}`;
    const renamed = `Renamed Test Opponent ${RUN}`;
    await ensureOpponent(page, name);

    await page.goto("/games/new");
    await page.getByLabel("Date").fill("2023-10-10");
    await page.getByLabel("Season").selectOption({ label: "23/24" });
    await page.getByLabel("Opponent").selectOption({ label: name });
    await page.getByRole("checkbox", { name: /Mark Kinnear/ }).check();
    await page.getByRole("button", { name: "Create game" }).click();
    await expect(page).toHaveURL(/\/games\/GME\d+$/);
    const gameUrl = page.url();

    await openEditPage(page, name);
    await page.getByLabel("Name").fill(renamed);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/opponents$/);

    await page.goto(gameUrl);
    await expect(
      page.getByRole("heading", { name: `vs ${renamed}` }),
    ).toBeVisible();
  });

  test("deleting an opponent that games use is blocked", async ({ page }) => {
    await openEditPage(page, "Rivals HC");
    await page.getByRole("button", { name: "Delete opponent" }).click();

    await expect(page.getByText(/is used by \d+ games?, so it can't be deleted/)).toBeVisible();
    await page.goto("/opponents");
    await expect(
      page.getByRole("link", { name: "Edit Rivals HC", exact: true }),
    ).toBeVisible();
  });

  test("deleting an unused opponent removes it", async ({ page }) => {
    const name = `Delete Test Opponent ${RUN}`;
    await createOpponent(page, name, {
      name: "logo.svg",
      mimeType: "image/svg+xml",
      buffer: SVG,
    });

    await openEditPage(page, name);
    await page.getByRole("button", { name: "Delete opponent" }).click();

    await expect(page).toHaveURL(/\/opponents$/);
    await expect(
      page.getByRole("link", { name: `Edit ${name}`, exact: true }),
    ).toHaveCount(0);
  });
});
