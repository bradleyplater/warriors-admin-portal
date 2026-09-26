import { expect, type Page } from "@playwright/test";

// Games pick their opponent from a list, so a spec that creates a game must
// make sure its opponent exists first. The local database persists between
// runs and opponent names are unique, so this only creates the opponent
// when it isn't already listed — safe to call on every run.
export async function ensureOpponent(page: Page, name: string): Promise<void> {
  await page.goto("/opponents");
  const existing = page.getByRole("link", { name: `Edit ${name}`, exact: true });
  if ((await existing.count()) > 0) {
    return;
  }

  await page.goto("/opponents/new");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Create opponent" }).click();
  await expect(page).toHaveURL(/\/opponents$/);
}
