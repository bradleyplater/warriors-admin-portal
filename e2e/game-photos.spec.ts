import sharp from "sharp";
import { ensureOpponent } from "./support/opponents";
import { expect, test, type Page } from "@playwright/test";

// Each test creates its own game (same isolation approach as
// record-and-edit-goals.spec.ts), so photo counts always start at zero.
// Serial because they share one opponent, and ensureOpponent racing itself
// in parallel trips the unique-name check.
test.describe.configure({ mode: "serial" });

const OPPONENT = "Photos Test Opponent";

async function createTestGame(page: Page): Promise<string> {
  await ensureOpponent(page, OPPONENT);
  await page.goto("/games/new");
  await page.getByLabel("Date").fill("2024-02-10");
  await page.getByLabel("Season").selectOption({ label: "23/24" });
  await page.getByLabel("Opponent").selectOption({ label: OPPONENT });
  await page.getByRole("button", { name: "Create game" }).click();
  await expect(page).toHaveURL(/\/games\/GME\d+$/);
  return page.url().split("/games/")[1];
}

// Generated rather than committed; each a different colour so they're
// distinct files.
async function photo(index: number) {
  const buffer = await sharp({
    create: {
      width: 1600,
      height: 900,
      channels: 3,
      background: { r: 40 * index, g: 80, b: 200 - 20 * index },
    },
  })
    .jpeg()
    .toBuffer();
  return { name: `photo-${index}.jpg`, mimeType: "image/jpeg", buffer };
}

async function uploadPhotos(page: Page, indexes: number[]) {
  await page
    .getByLabel("Add photos")
    .setInputFiles(await Promise.all(indexes.map(photo)));
  const status = page.getByTestId("photo-upload-status");
  for (const index of indexes) {
    await expect(status.getByText(`photo-${index}.jpg`).locator("..")).toContainText(
      /Added|Not added/,
      { timeout: 30_000 },
    );
  }
}

const captions = (page: Page) =>
  page.getByTestId("game-photo").getByLabel("Caption");

test.describe("game photos", () => {
  test("upload, caption, reorder and delete photos", async ({ page }) => {
    await createTestGame(page);
    await expect(page.getByTestId("photo-count")).toHaveText("0 of 6");

    await uploadPhotos(page, [1, 2]);
    await expect(page.getByTestId("photo-count")).toHaveText("2 of 6");
    await expect(page.getByTestId("game-photo")).toHaveCount(2);

    // Thumbnails actually load through the read-through route.
    const firstImage = page.getByTestId("game-photo").first().getByRole("img");
    await expect
      .poll(() => firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    const first = page.getByTestId("game-photo").first();
    await first.getByLabel("Caption").fill("Opening face-off");
    await first.getByRole("button", { name: "Save photo 1 text" }).click();
    await expect(first.getByRole("status")).toHaveText("Saved");

    // The captioned photo moves to second place.
    await first.getByRole("button", { name: /Later/ }).click();
    await expect(captions(page).nth(1)).toHaveValue("Opening face-off");
    await expect(captions(page).nth(0)).toHaveValue("");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete photo 2" }).click();
    await expect(page.getByTestId("game-photo")).toHaveCount(1);
    await expect(captions(page).first()).toHaveValue("");

    await expect(page.getByTestId("publish-status")).toHaveAttribute(
      "data-state",
      "unpublished",
    );
  });

  test("a game is limited to six photos", async ({ page }) => {
    await createTestGame(page);

    await uploadPhotos(page, [1, 2, 3, 4]);
    await expect(page.getByTestId("photo-count")).toHaveText("4 of 6");

    // Three picked with two slots left: the third is skipped up front.
    await uploadPhotos(page, [5, 6, 7]);
    await expect(page.getByTestId("photo-count")).toHaveText("6 of 6");
    await expect(page.getByTestId("game-photo")).toHaveCount(6);

    await expect(page.getByLabel("Add photos")).toHaveCount(0);
    await expect(page.getByText("This game has the maximum of 6 photos")).toBeVisible();
  });

  test("cancelling the delete confirmation keeps the photo", async ({ page }) => {
    await createTestGame(page);
    await uploadPhotos(page, [1]);

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Delete photo 1" }).click();
    await expect(page.getByTestId("game-photo")).toHaveCount(1);
  });
});
